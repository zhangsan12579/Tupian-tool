// 全局变量
let originalImage = null;
let generatedImage = null;
let operationHistory = [];
let historyIndex = -1;
let subtitleBackground = null;

// 最近生成的图片记录（最多保存3张）
let recentImages = [];
const MAX_RECENT_IMAGES = 6;

// DOM元素对象（将在init函数中初始化）
let elements = {};

// Canvas上下文
let ctx = null;

// 初始化函数
function init() {
    // 获取DOM元素
    elements = {
        // 上传相关
        fileInput: document.getElementById('fileInput'),
        uploadArea: document.getElementById('uploadArea'),
        fileInfo: document.getElementById('fileInfo'),
        fileName: document.getElementById('fileName'),
        fileSize: document.getElementById('fileSize'),
        
        // 样式设置相关
        fontSize: document.getElementById('fontSize'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        fontFamily: document.getElementById('fontFamily'),
        fontColor: document.getElementById('fontColor'),
        outlineColor: document.getElementById('outlineColor'),
        outlineWidth: document.getElementById('outlineWidth'),
        outlineWidthValue: document.getElementById('outlineWidthValue'),
        backgroundColor: document.getElementById('backgroundColor'),
        backgroundOpacity: document.getElementById('backgroundOpacity'),
        backgroundOpacityValue: document.getElementById('backgroundOpacityValue'),
        backgroundHeight: document.getElementById('backgroundHeight'),
        backgroundHeightValue: document.getElementById('backgroundHeightValue'),
        textAlignLeft: document.getElementById('textAlignLeft'),
        textAlignCenter: document.getElementById('textAlignCenter'),
        textAlignRight: document.getElementById('textAlignRight'),
        
        // 选项卡相关
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        
        // 文本输入相关
        subtitleText: document.getElementById('subtitleText'),
        textLines: document.getElementById('textLines'),
        textChars: document.getElementById('textChars'),
        clearTextBtn: document.getElementById('clearTextBtn'),
        templateBtn: document.getElementById('templateBtn'),
        
        // 预览相关
        previewCanvas: document.getElementById('previewCanvas'),
        previewPlaceholder: document.getElementById('previewPlaceholder'),
        zoomBtn: document.getElementById('zoomBtn'),
        
        // 操作按钮
        generateBtn: document.getElementById('generateBtn'),
        saveBtn: document.getElementById('saveBtn'),
        resetBtn: document.getElementById('resetBtn'),
        
        // 保存选项
        saveFormat: document.getElementById('saveFormat'),
        saveQuality: document.getElementById('saveQuality'),
        saveQualityValue: document.getElementById('saveQualityValue'),
        
        // 模态框
        helpModal: document.getElementById('helpModal'),
        aboutModal: document.getElementById('aboutModal'),
        saveSettingsModal: document.getElementById('saveSettingsModal'),
        helpLink: document.getElementById('helpLink'),
        aboutLink: document.getElementById('aboutLink'),
        saveSettingsLink: document.getElementById('saveSettingsLink'),
        closeBtns: document.querySelectorAll('.close'),
        
        // 提示信息
        toast: document.getElementById('toast')
    };
    
    // 初始化Canvas上下文
    if (elements.previewCanvas) {
        ctx = elements.previewCanvas.getContext('2d');
    }
    
    // 绑定事件
    bindEvents();
    
    // 更新初始值显示
    updateValueDisplays();
    
    // 更新文本统计
    updateTextStats();
    
    // 加载用户偏好设置
    loadUserPreferences();
    
    // 加载最近图片记录
    loadRecentImagesFromStorage();
}

// 绑定事件函数
function bindEvents() {
    // 上传事件
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽事件
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    
    // 样式设置事件
    elements.fontSize.addEventListener('input', function() {
        updateValueDisplays();
        updateCanvasSize();
        updatePreview();
    });
    elements.outlineWidth.addEventListener('input', updateValueDisplays);
    elements.backgroundOpacity.addEventListener('input', updateValueDisplays);
    elements.backgroundHeight.addEventListener('input', function() {
        updateValueDisplays();
        updateCanvasSize();
        updatePreview();
    });
    elements.saveQuality.addEventListener('input', updateValueDisplays);
    
    // 所有样式变化都触发实时预览
    const styleInputs = document.querySelectorAll('.style-section input, .style-section select');
    styleInputs.forEach(input => {
        input.addEventListener('change', updatePreview);
    });
    
    // 选项卡切换事件
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            switchTab(targetTab);
        });
    });
    
    // 文本输入事件
    elements.subtitleText.addEventListener('input', function() {
        updateTextStats();
        updateCanvasSize();
        updatePreview();
    });
    elements.clearTextBtn.addEventListener('click', clearText);
    elements.templateBtn.addEventListener('click', showTemplates);
    
    // 操作按钮事件
    elements.generateBtn.addEventListener('click', generateImage);
    elements.saveBtn.addEventListener('click', saveImage);
    elements.resetBtn.addEventListener('click', resetSettings);
    
    // 模态框事件
    elements.helpLink.addEventListener('click', () => showModal(elements.helpModal));
    elements.aboutLink.addEventListener('click', () => showModal(elements.aboutModal));
    elements.saveSettingsLink.addEventListener('click', () => showModal(elements.saveSettingsModal));
    elements.closeBtns.forEach(btn => {
        btn.addEventListener('click', hideModal);
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal();
        }
    });
    
    // 放大查看事件
    elements.zoomBtn.addEventListener('click', zoomImage);
}

// 文件选择处理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 拖拽事件处理
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processFile(file);
    } else {
        showToast('请上传图片文件', 'error');
    }
}

// 文件处理
function processFile(file) {
    // 验证文件大小
    if (file.size > 10 * 1024 * 1024) { // 10MB
        showToast('图片大小不能超过10MB', 'error');
        return;
    }
    
    // 显示文件信息
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.style.display = 'flex';
    
    // 读取图片
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            elements.previewPlaceholder.style.display = 'none';
            elements.previewCanvas.style.display = 'block';
            updateCanvasSize();
            updatePreview();
            elements.generateBtn.disabled = false;
            showToast('图片上传成功', 'success');
        };
        img.onerror = function() {
            showToast('图片加载失败', 'error');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 更新数值显示
function updateValueDisplays() {
    elements.fontSizeValue.textContent = elements.fontSize.value;
    elements.outlineWidthValue.textContent = elements.outlineWidth.value;
    elements.backgroundOpacityValue.textContent = elements.backgroundOpacity.value;
    elements.backgroundHeightValue.textContent = elements.backgroundHeight.value;
    elements.saveQualityValue.textContent = elements.saveQuality.value + '%';
    
    // 触发实时预览
    updatePreview();
}

// 更新文本统计
function updateTextStats() {
    const text = elements.subtitleText.value;
    const lines = text.split('\n').length;
    const chars = text.length;
    
    elements.textLines.textContent = `${lines} 行`;
    elements.textChars.textContent = `${chars} 字符`;
}

// 清空文本
function clearText() {
    if (confirm('确定要清空所有文本吗？')) {
        elements.subtitleText.value = '';
        updateTextStats();
        updateCanvasSize();
        updatePreview();
        showToast('文本已清空', 'info');
    }
}

// 显示文本模板
function showTemplates() {
    const templates = [
        '别吵\n我在给自己写钓鱼网站呢\n对，这年头\n咱们猫咪都能自己写代码了',
        '今天天气真好\n适合出门散步\n享受阳光的温暖',
        '生活不止眼前的苟且\n还有诗和远方的田野',
        '努力不一定成功\n但放弃一定失败' 
    ];
    
    const template = prompt('选择模板（输入1-4）:\n1. 幽默模板\n2. 日常模板\n3. 文艺模板\n4. 励志模板');
    
    if (template && templates[parseInt(template) - 1]) {
        elements.subtitleText.value = templates[parseInt(template) - 1];
        updateTextStats();
        updateCanvasSize();
        updatePreview();
        showToast('模板已应用', 'success');
    }
}

// 更新Canvas大小（包含图片下方的字幕区域）
function updateCanvasSize() {
    if (originalImage) {
        const settings = getCurrentSettings();
        const lines = settings.subtitleText.split('\n').filter(line => line.trim() !== '');
        const lineHeight = settings.fontSize * settings.backgroundHeight; // 行高为字体大小的指定倍数
        const subtitleHeight = lines.length * lineHeight;
        
        // 重置背景切片，因为行高可能变化
        subtitleBackground = null;
        
        elements.previewCanvas.width = originalImage.width;
        elements.previewCanvas.height = originalImage.height + subtitleHeight;
    }
}

// 获取当前样式设置
function getCurrentSettings() {
    return {
        fontSize: parseInt(elements.fontSize.value),
        fontFamily: elements.fontFamily.value,
        fontColor: elements.fontColor.value,
        outlineColor: elements.outlineColor.value,
        outlineWidth: parseInt(elements.outlineWidth.value),
        backgroundColor: elements.backgroundColor.value,
        backgroundOpacity: parseInt(elements.backgroundOpacity.value),
        backgroundHeight: parseFloat(elements.backgroundHeight.value),
        textAlign: elements.textAlignLeft.checked ? 'left' : 
                  elements.textAlignRight.checked ? 'right' : 'center',
        subtitleText: elements.subtitleText.value
    };
}

// 更新预览
function updatePreview() {
    if (!originalImage) return;
    
    const ctx = elements.previewCanvas.getContext('2d');
    
    // 清空Canvas
    ctx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
    
    // 绘制原图
    ctx.drawImage(originalImage, 0, 0);
    
    // 绘制字幕
    drawSubtitle(ctx, getCurrentSettings());
}

// 绘制字幕
function drawSubtitle(ctx, settings) {
    const { 
        fontSize, fontFamily, fontColor, outlineColor, outlineWidth, 
        backgroundColor, backgroundOpacity, backgroundHeight, textAlign, 
        subtitleText 
    } = settings;
    
    // 分割文本为多行
    const lines = subtitleText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;
    
    // 计算行高（单行字体高度）
    const lineHeight = fontSize * backgroundHeight;
    
    // 设置字体
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // 截取图片底部的单行字幕高度区域作为背景
    if (!subtitleBackground && originalImage) {
        // 创建临时canvas来保存背景切片
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = lineHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 从原图底部截取单行高度的区域
        tempCtx.drawImage(originalImage, 0, originalImage.height - lineHeight, originalImage.width, lineHeight, 0, 0, originalImage.width, lineHeight);
        
        // 保存背景切片
        subtitleBackground = tempCanvas;
    }
    
    // 绘制每行文字（在图片底部，使用图片本身作为背景）
    lines.forEach((line, index) => {
        if (line.trim() === '') return;
        
        // 计算文本宽度
        const textWidth = ctx.measureText(line).width;
        
        // 计算文本X坐标（根据对齐方式）
        let textX;
        if (textAlign === 'left') {
            textX = 0;
        } else if (textAlign === 'right') {
            textX = elements.previewCanvas.width - textWidth;
        } else {
            textX = (elements.previewCanvas.width - textWidth) / 2;
        }
        
        // 计算文字位置（在图片底部）
        const textY = originalImage.height + index * lineHeight + lineHeight / 2;
        
        // 计算背景绘制位置
        const backgroundY = originalImage.height + index * lineHeight;
        
        // 绘制纯色背景
        ctx.globalAlpha = backgroundOpacity / 100;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, backgroundY, elements.previewCanvas.width, lineHeight);
        ctx.globalAlpha = 1;
        
        // 绘制背景切片
        if (subtitleBackground) {
            ctx.globalAlpha = backgroundOpacity / 100;
            ctx.drawImage(subtitleBackground, 0, backgroundY);
            ctx.globalAlpha = 1;
        }
        
        // 绘制文字轮廓
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.textBaseline = 'middle';
        ctx.strokeText(line, textX, textY);
        
        // 绘制文字
        ctx.fillStyle = fontColor;
        ctx.fillText(line, textX, textY);
    });
}

// 生成图片
function generateImage() {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }
    
    // 保存当前操作到历史记录
    saveToHistory();
    
    // 生成图片
    updatePreview();
    generatedImage = elements.previewCanvas.toDataURL();
    
    // 保存到最近图片记录
    saveToRecentImages();
    
    // 更新UI
    elements.saveBtn.disabled = false;
    showToast('图片生成成功', 'success');
}

// 保存到最近图片记录
function saveToRecentImages() {
    if (!generatedImage || !originalImage) return;
    
    // 检查是否已存在相同的图片记录（通过比较图片数据）
    const isDuplicate = recentImages.some(record => 
        record.imageData === generatedImage
    );
    
    // 如果是重复图片，则不保存
    if (isDuplicate) {
        return;
    }
    
    // 创建图片记录对象
    const imageRecord = {
        id: Date.now(),
        imageData: generatedImage, // 完整的生成图片（包含字幕）
        originalImageData: originalImage.src, // 原始图片数据
        timestamp: new Date(),
        settings: getCurrentSettings()
    };
    
    // 将新记录添加到数组开头
    recentImages.unshift(imageRecord);
    
    // 限制记录数量
    if (recentImages.length > MAX_RECENT_IMAGES) {
        recentImages.pop();
    }
    
    // 更新最近图片记录的显示
    updateRecentImagesDisplay();
    
    // 保存到localStorage，以便页面刷新后仍能显示
    saveRecentImagesToStorage();
}

// 保存图片
function saveImage() {
    if (!generatedImage) {
        showToast('请先生成图片', 'error');
        return;
    }
    
    const format = elements.saveFormat.value;
    const quality = elements.saveQuality.value / 100;
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `字幕图片_${new Date().getTime()}.${format}`;
    
    // 根据格式调整质量
    if (format === 'jpg') {
        link.href = elements.previewCanvas.toDataURL('image/jpeg', quality);
    } else {
        link.href = elements.previewCanvas.toDataURL('image/png');
    }
    
    link.click();
    showToast('图片保存成功', 'success');
}

// 保存最近图片到localStorage
function saveRecentImagesToStorage() {
    // 将Date对象转换为ISO字符串以便存储
    const recentImagesToStore = recentImages.map(img => ({
        ...img,
        timestamp: img.timestamp.toISOString()
    }));
    localStorage.setItem('subtitleGeneratorRecentImages', JSON.stringify(recentImagesToStore));
}

// 从localStorage加载最近图片
function loadRecentImagesFromStorage() {
    const stored = localStorage.getItem('subtitleGeneratorRecentImages');
    if (stored) {
        try {
            const recentImagesFromStore = JSON.parse(stored);
            // 将ISO字符串转换回Date对象
            recentImages = recentImagesFromStore.map(img => ({
                ...img,
                timestamp: new Date(img.timestamp)
            }));
            // 更新显示
            updateRecentImagesDisplay();
        } catch (e) {
            console.error('加载最近图片记录失败:', e);
        }
    }
}

// 更新最近图片记录的显示
function updateRecentImagesDisplay() {
    // 检查是否存在最近图片容器，如果不存在则创建
    let container = document.getElementById('recentImagesContainer');
    if (!container) {
        // 创建容器
        container = document.createElement('div');
        container.id = 'recentImagesContainer';
        container.className = 'recent-images-container';
        
        // 添加标题
        const title = document.createElement('h3');
        title.textContent = '最近生成的图片';
        container.appendChild(title);
        
        // 添加到页面中（在主内容区底部）
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(container);
        }
    }
    
    // 清空容器内容
    container.innerHTML = '<h3>最近生成的图片</h3>';
    
    // 如果没有最近图片，显示提示
    if (recentImages.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = '暂无最近生成的图片';
        container.appendChild(emptyMessage);
        return;
    }
    
    // 创建图片网格
    const grid = document.createElement('div');
    grid.className = 'recent-images-grid';
    container.appendChild(grid);
    
    // 添加最近图片
    recentImages.forEach((record, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'recent-image-item';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = record.imageData;
        img.alt = `最近生成的图片 ${index + 1}`;
        img.className = 'recent-image';
        
        // 添加单击事件：放大预览
        img.addEventListener('click', () => zoomRecentImage(record));
        
        // 添加双击事件：重新加载
        img.addEventListener('dblclick', () => loadRecentImage(record));
        
        // 添加图片
        imageItem.appendChild(img);
        
        // 添加时间戳
        const timestamp = document.createElement('span');
        timestamp.className = 'recent-image-timestamp';
        timestamp.textContent = record.timestamp.toLocaleString();
        imageItem.appendChild(timestamp);
        
        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'recent-image-delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = '删除此图片';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发图片点击事件
            deleteRecentImage(index);
        });
        imageItem.appendChild(deleteBtn);
        
        // 添加到网格
        grid.appendChild(imageItem);
    });
}

// 删除最近图片
function deleteRecentImage(index) {
    if (index < 0 || index >= recentImages.length) {
        return;
    }
    
    // 从数组中移除
    recentImages.splice(index, 1);
    
    // 更新显示
    updateRecentImagesDisplay();
    
    // 保存到localStorage
    saveRecentImagesToStorage();
    
    // 显示提示
    showToast('图片已删除', 'success');
}

// 加载最近图片
function loadRecentImage(record) {
    if (!record) return;
    
    // 创建图片对象
    const img = new Image();
    img.onload = function() {
        // 更新originalImage
        originalImage = img;
        
        // 更新预览
        updateCanvasSize();
        updatePreview();
        
        // 更新UI
        elements.previewPlaceholder.style.display = 'none';
        elements.previewCanvas.style.display = 'block';
        elements.generateBtn.disabled = false;
        
        // 更新样式设置
        if (record.settings) {
            elements.fontSize.value = record.settings.fontSize;
            elements.fontFamily.value = record.settings.fontFamily;
            elements.fontColor.value = record.settings.fontColor;
            elements.outlineColor.value = record.settings.outlineColor;
            elements.outlineWidth.value = record.settings.outlineWidth;
            elements.backgroundColor.value = record.settings.backgroundColor;
            elements.backgroundOpacity.value = record.settings.backgroundOpacity;
            
            // 更新文本对齐
            elements.textAlignLeft.checked = record.settings.textAlign === 'left';
            elements.textAlignCenter.checked = record.settings.textAlign === 'center';
            elements.textAlignRight.checked = record.settings.textAlign === 'right';
            
            // 更新数值显示
            updateValueDisplays();
        }
        
        showToast('最近图片加载成功', 'success');
    };
    img.onerror = function() {
        showToast('最近图片加载失败', 'error');
    };
    
    // 加载原始图片而不是完整生成的图片，这样实时预览才能正常工作
    img.src = record.originalImageData;
}

// 放大预览最近生成的图片
function zoomRecentImage(record) {
    if (!record || !record.imageData) return;
    
    // 创建放大预览
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = record.imageData; // 使用完整生成的图片数据
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    // 点击关闭
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 重置设置
function resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
        // 重置上传区域
        elements.fileInput.value = '';
        elements.fileInfo.style.display = 'none';
        originalImage = null;
        generatedImage = null;
        
        // 重置样式设置
        elements.fontSize.value = 32;
        elements.fontFamily.value = 'Impact, Microsoft YaHei, Arial';
        elements.fontColor.value = '#ffffff';
        elements.outlineColor.value = '#000000';
        elements.outlineWidth.value = 3;
        elements.backgroundOpacity.value = 50;
        elements.textAlignCenter.checked = true;
        
        // 重置文本
        elements.subtitleText.value = '别吵\n我在给自己写钓鱼网站呢\n对，这年头\n咱们猫咪都能自己写代码了';
        
        // 重置预览
        elements.previewCanvas.style.display = 'none';
        elements.previewPlaceholder.style.display = 'block';
        
        // 重置按钮状态
        elements.generateBtn.disabled = true;
        elements.saveBtn.disabled = true;
        
        // 重置数值显示
        updateValueDisplays();
        updateTextStats();
        
        // 清空历史记录
        operationHistory = [];
        historyIndex = -1;
        
        showToast('设置已重置', 'success');
    }
}

// 放大查看
function zoomImage() {
    if (!originalImage) return;
    
    // 创建放大预览
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = elements.previewCanvas.toDataURL();
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    // 点击关闭
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 保存操作到历史记录
function saveToHistory() {
    if (originalImage) {
        // 移除当前索引之后的历史记录
        if (historyIndex < operationHistory.length - 1) {
            operationHistory = operationHistory.slice(0, historyIndex + 1);
        }
        
        // 保存当前设置
        operationHistory.push({
            image: originalImage,
            settings: getCurrentSettings()
        });
        
        // 限制历史记录数量
        if (operationHistory.length > 10) {
            operationHistory.shift();
        } else {
            historyIndex++;
        }
    }
}

// 显示模态框
function showModal(modal) {
    modal.style.display = 'block';
}

// 隐藏模态框
function hideModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// 显示提示信息
function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 保存用户偏好设置
function saveUserPreferences() {
    const settings = getCurrentSettings();
    localStorage.setItem('subtitleGeneratorSettings', JSON.stringify(settings));
}

// 加载用户偏好设置
function loadUserPreferences() {
    const saved = localStorage.getItem('subtitleGeneratorSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            // 恢复设置
            elements.fontSize.value = settings.fontSize;
            elements.fontFamily.value = settings.fontFamily;
            elements.fontColor.value = settings.fontColor;
            elements.outlineColor.value = settings.outlineColor;
            elements.outlineWidth.value = settings.outlineWidth;
            elements.backgroundOpacity.value = settings.backgroundOpacity;
            
            // 恢复文本对齐
            elements.textAlignLeft.checked = settings.textAlign === 'left';
            elements.textAlignCenter.checked = settings.textAlign === 'center';
            elements.textAlignRight.checked = settings.textAlign === 'right';
            
            // 更新数值显示
            updateValueDisplays();
        } catch (e) {
            console.error('加载用户设置失败:', e);
        }
    }
}

// 切换选项卡函数
function switchTab(tabId) {
    // 移除所有选项卡按钮的激活状态
    elements.tabBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 移除所有选项卡面板的激活状态
    elements.tabPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 激活当前选项卡按钮
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        // 移除了scrollIntoView调用，避免影响页面滚动条位置
    }
    
    // 激活当前选项卡面板
    const activePanel = document.getElementById(tabId);
    if (activePanel) {
        activePanel.classList.add('active');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 直接调用init函数，确保初始化一定会执行
init();