// 全局变量存储歌曲数据
let allSongs = [];
let genreStats = [];
const apiUrl = 'https://sheetdb.io/api/v1/ki9gdqgc7ffrr';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 绑定随机按钮事件
    const randomButton = document.getElementById('randomButton');
    if (randomButton) {
        randomButton.addEventListener('click', copyRandomSong);
    }
    
    // 绑定搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(this.timer);
            this.timer = setTimeout(applyFilters, 300);
        });
    }
    
    // 绑定风格筛选器
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) {
        genreFilter.addEventListener('change', applyFilters);
    }
    
    // 初始化加载歌曲
    loadSongs();
    
    // 加载最近点歌记录
    displayRecentSongs();
    
    // 直播状态检测
    detectLiveStatus();
});

// 加载歌曲数据
async function loadSongs() {
    try {
        const loading = document.getElementById('loading');
        const songTable = document.getElementById('songTable');
        const randomButton = document.getElementById('randomButton');
        const searchInput = document.getElementById('searchInput');
        const genreFilter = document.getElementById('genreFilter');
        
        // 显示加载状态
        if (loading) loading.style.display = 'block';
        if (songTable) songTable.style.display = 'none';
        if (randomButton) randomButton.disabled = true;
        if (searchInput) searchInput.disabled = true;
        if (genreFilter) genreFilter.disabled = true;
        
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), 10000)
        );
        
        // 获取数据
        const response = await Promise.race([
            fetch(apiUrl),
            timeoutPromise
        ]);
        
        if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
        
        let data = await response.json();
        
        // 处理不同格式的数据
        if (Array.isArray(data)) {
            allSongs = data;
        } else if (typeof data === 'object' && data !== null) {
            allSongs = Object.values(data);
        } else {
            throw new Error('数据格式无效');
        }
        
        // 智能修正数据
        allSongs = allSongs.map(song => {
            // 自动修正空值
            if (!song['歌手'] || song['歌手'].trim() === '') {
                song['歌手'] = '未知歌手';
            }
            
            if (!song['风格'] || song['风格'].trim() === '') {
                // 使用AI预测风格
                song['风格'] = predictGenre(song['歌名'] || '', song['歌手']);
            }
            
            return song;
        });
        
        // 生成风格统计
        if (allSongs.length > 0) {
            const genreCount = {};
            
            allSongs.forEach(song => {
                const genre = song['风格'] || '未知';
                genreCount[genre] = (genreCount[genre] || 0) + 1;
            });
            
            // 转换为数组并排序
            genreStats = Object.keys(genreCount).map(genre => {
                return { genre, count: genreCount[genre] };
            }).sort((a, b) => b.count - a.count);
            
            // 保存统计信息到localStorage
            localStorage.setItem('songStats', JSON.stringify({
                songCount: allSongs.length,
                genreStats: genreStats
            }));
        }
        
        // 更新UI
        if (loading) loading.style.display = 'none';
        if (songTable) songTable.style.display = 'table';
        if (randomButton) randomButton.disabled = false;
        if (searchInput) searchInput.disabled = false;
        if (genreFilter) genreFilter.disabled = false;
        
        // 填充风格筛选器
        populateGenreFilter();
        
        // 显示歌曲
        displaySongs(allSongs);
        
        // 添加行点击事件
        addRowClickEvents();
        
        // 显示加载成功通知
        showToast('歌单加载成功!');
        
    } catch (error) {
        console.error('加载歌曲失败:', error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.textContent = '加载失败: ' + (error.message || '未知错误');
            loading.style.color = 'red';
        }
        showToast('加载歌单失败: ' + (error.message || '未知错误'), 'error');
    }
}

// 显示歌曲表格
function displaySongs(songs) {
    const tbody = document.querySelector('#songTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    songs.forEach(song => {
        // 检测可能的问题
        const issues = detectSongIssues(song);
        
        const row = document.createElement('tr');
        row.setAttribute('data-song-info', `${song['歌名'] || ''} - ${song['歌手'] || ''}`);
        
        // 如果有问题，添加特殊样式
        if (issues.length > 0) {
            row.classList.add('has-issue');
            row.setAttribute('data-issues', JSON.stringify(issues));
        }
        
        row.innerHTML = `
            <td>${song['歌名'] || '-'}</td>
            <td>${song['歌手'] || '-'}</td>
            <td>${song['风格'] || '-'}</td>
            <td>
                ${song['链接'] ? `<a href="${song['链接']}" target="_blank" class="btn btn-sm btn-outline-purple">播放</a>` : '-'}
                ${issues.length > 0 ? `<button class="btn btn-sm btn-warning ms-1 issue-btn" data-bs-toggle="tooltip" title="检测到${issues.length}个问题"><i class="bi bi-exclamation-triangle"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // 初始化问题提示按钮
    initIssueButtons();
}

// 初始化问题提示按钮
function initIssueButtons() {
    const issueButtons = document.querySelectorAll('.issue-btn');
    issueButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const row = this.closest('tr');
            if (row) {
                const issues = JSON.parse(row.getAttribute('data-issues') || '[]');
                showIssuesDialog(issues, row);
            }
        });
    });
    
    // 初始化Tooltip
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// 显示问题对话框
function showIssuesDialog(issues, row) {
    // 移除现有对话框
    const existingDialog = document.getElementById('issueDialog');
    if (existingDialog) existingDialog.remove();
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.id = 'issueDialog';
    dialog.className = 'issue-dialog p-3 rounded shadow';
    dialog.style.position = 'fixed';
    dialog.style.zIndex = '9999';
    dialog.style.backgroundColor = 'white';
    dialog.style.border = '1px solid #ddd';
    dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    let content = `<h5 class="mb-3">检测到问题 <span class="badge bg-warning">${issues.length}</span></h5>`;
    
    issues.forEach((issue, index) => {
        content += `
        <div class="issue-item mb-2 p-2 border rounded">
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-circle-fill text-warning me-2"></i>
                <strong>${issue.type}</strong>
            </div>
            <div class="mt-2">${issue.description}</div>
            <div class="mt-2">建议修正: <span class="text-success">${issue.suggestion}</span></div>
            <div class="mt-2">
                <button class="btn btn-sm btn-success apply-fix" data-index="${index}" data-row-id="${row.rowIndex}">
                    <i class="bi bi-check-circle"></i> 应用修正
                </button>
                <button class="btn btn-sm btn-outline-secondary ms-2 report-false-positive" data-index="${index}">
                    <i class="bi bi-x-circle"></i> 报告误判
                </button>
            </div>
        </div>`;
    });
    
    dialog.innerHTML = content;
    document.body.appendChild(dialog);
    
    // 定位在按钮旁边
    const buttonRect = row.querySelector('.issue-btn').getBoundingClientRect();
    dialog.style.top = `${buttonRect.bottom + window.scrollY}px`;
    dialog.style.left = `${Math.max(10, buttonRect.left - 100)}px`;
    
    // 绑定应用修正事件
    dialog.querySelectorAll('.apply-fix').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const rowIndex = parseInt(this.getAttribute('data-row-id'));
            applyFix(issues[index], rowIndex);
            dialog.remove();
        });
    });
    
    // 绑定误报事件
    dialog.querySelectorAll('.report-false-positive').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            reportFalsePositive(issues[index]);
            showToast('感谢您的反馈，我们将改进检测系统');
            dialog.remove();
        });
    });
    
    // 点击外部关闭对话框
    document.addEventListener('click', function closeDialog(e) {
        if (!dialog.contains(e.target) && e.target !== btn) {
            dialog.remove();
            document.removeEventListener('click', closeDialog);
        }
    });
}

// 应用修正
function applyFix(issue, rowIndex) {
    const rows = document.querySelectorAll('#songTable tbody tr');
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    
    const row = rows[rowIndex];
    const songIndex = Array.from(rows).indexOf(row);
    
    if (songIndex >= 0 && songIndex < allSongs.length) {
        // 更新数据
        const song = allSongs[songIndex];
        
        if (issue.field === "歌手") {
            song['歌手'] = issue.suggestion;
        } else if (issue.field === "风格") {
            song['风格'] = issue.suggestion;
        }
        
        // 更新显示
        if (issue.field === "歌手") {
            row.cells[1].textContent = issue.suggestion;
        } else if (issue.field === "风格") {
            row.cells[2].textContent = issue.suggestion;
        }
        
        // 更新统计信息
        if (issue.field === "风格") {
            updateGenreStats();
        }
        
        // 移除问题标记
        const issues = JSON.parse(row.getAttribute('data-issues') || '[]').filter(i => i !== issue);
        if (issues.length === 0) {
            row.classList.remove('has-issue');
            row.removeAttribute('data-issues');
            row.querySelector('.issue-btn').remove();
        } else {
            row.setAttribute('data-issues', JSON.stringify(issues));
        }
        
        showToast(`已修正: ${issue.description}`);
    }
}

// 更新风格统计
function updateGenreStats() {
    if (allSongs.length === 0) return;
    
    const genreCount = {};
    
    allSongs.forEach(song => {
        const genre = song['风格'] || '未知';
        genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
    
    // 转换为数组并排序
    genreStats = Object.keys(genreCount).map(genre => {
        return { genre, count: genreCount[genre] };
    }).sort((a, b) => b.count - a.count);
    
    // 保存统计信息到localStorage
    localStorage.setItem('songStats', JSON.stringify({
        songCount: allSongs.length,
        genreStats: genreStats
    }));
    
    // 更新筛选器
    populateGenreFilter();
}

// 报告误报
function reportFalsePositive(issue) {
    // 这里应该将误报发送到后端进行记录
    // 实际应用中应该记录这些反馈用于改进模型
    console.log('误报报告:', issue);
    
    // 在本地存储记录以便后续分析
    const falsePositives = JSON.parse(localStorage.getItem('falsePositives') || '[]');
    falsePositives.push({
        ...issue,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('falsePositives', JSON.stringify(falsePositives));
}

// 添加行点击事件
function addRowClickEvents() {
    const rows = document.querySelectorAll('#songTable tbody tr');
    
    rows.forEach(row => {
        row.addEventListener('click', function(event) {
            // 如果点击的是播放按钮或问题按钮，不触发复制
            if (event.target.closest('a') || event.target.closest('.issue-btn')) {
                return;
            }
            
            // 获取歌曲信息
            const songInfo = this.getAttribute('data-song-info') || '';
            
            if (!songInfo) return;
            
            // 复制到剪贴板
            copyToClipboard(songInfo);
            
            // 添加复制成功动画
            this.classList.add('copied');
            setTimeout(() => {
                this.classList.remove('copied');
            }, 1500);
            
            // 保存到最近点歌
            const parts = songInfo.split(' - ');
            if (parts.length >= 2) {
                saveRecentSong({
                    '歌名': parts[0] || '未知歌曲',
                    '歌手': parts[1] || '未知歌手'
                });
            }
            
            // 显示提示
            showToast('已复制: ' + songInfo);
        });
    });
}

// 填充风格筛选器
function populateGenreFilter() {
    const genreFilter = document.getElementById('genreFilter');
    if (!genreFilter || !genreStats || genreStats.length === 0) return;
    
    // 清空现有选项（保留"所有风格"）
    genreFilter.innerHTML = '<option value="">所有风格</option>';
    
    // 添加所有风格选项
    genreStats.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat.genre;
        option.textContent = `${stat.genre} (${stat.count})`;
        genreFilter.appendChild(option);
    });
}

// 应用筛选（搜索+风格）
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedGenre = genreFilter ? genreFilter.value : '';
    
    const filteredSongs = allSongs.filter(song => {
        const songName = (song['歌名'] || '').toLowerCase();
        const artist = (song['歌手'] || '').toLowerCase();
        const genre = (song['风格'] || '').toLowerCase();
        
        // 搜索匹配
        const matchesSearch = searchText === '' || 
            songName.includes(searchText) || 
            artist.includes(searchText) || 
            genre.includes(searchText);
        
        // 风格匹配
        const matchesGenre = selectedGenre === '' || 
            (song['风格'] === selectedGenre);
        
        return matchesSearch && matchesGenre;
    });
    
    displaySongs(filteredSongs);
    addRowClickEvents(); // 重新绑定点击事件
}

// 复制随机歌曲到剪贴板并显示提示框
function copyRandomSong() {
    if (!allSongs || allSongs.length === 0) {
        showToast('歌单为空，无法随机选择', 'error');
        return;
    }
    
    // 随机选择一首歌
    const randomIndex = Math.floor(Math.random() * allSongs.length);
    const randomSong = allSongs[randomIndex];
    
    // 创建复制内容
    const songName = randomSong['歌名'] || '未知歌曲';
    const artist = randomSong['歌手'] || '未知歌手';
    const songInfo = `${songName} - ${artist}`;
    
    // 保存到最近点歌
    saveRecentSong({
        '歌名': songName,
        '歌手': artist
    });
    
    // 复制到剪贴板
    copyToClipboard(songInfo);
    
    // 显示提示
    showToast('已复制: ' + songInfo);
}

// 通用复制到剪贴板函数
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('复制失败:', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

// 兼容性复制方法
function fallbackCopy(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!success) {
            throw new Error('复制命令失败');
        }
    } catch (err) {
        console.error('复制失败:', err);
        return false;
    }
    return true;
}

// 保存最近点歌记录
function saveRecentSong(song) {
    if (!song) return;
    
    let recentSongs = JSON.parse(localStorage.getItem('recentSongs')) || [];
    
    // 获取当前时间
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 如果歌曲已存在，移动到最前
    recentSongs = recentSongs.filter(s => 
        s['歌名'] !== song['歌名'] || s['歌手'] !== song['歌手']);
    
    // 添加到开头（只保存歌名和歌手）
    recentSongs.unshift({
        '歌名': song['歌名'] || '未知歌曲',
        '歌手': song['歌手'] || '未知歌手',
        '时间': timeString
    });
    
    // 只保留最近5首
    recentSongs = recentSongs.slice(0, 5);
    
    localStorage.setItem('recentSongs', JSON.stringify(recentSongs));
    displayRecentSongs(recentSongs);
}

// 显示最近点歌
function displayRecentSongs(recentSongs = null) {
    const recentContainer = document.getElementById('recentSongs');
    if (!recentContainer) return;
    
    let songsToDisplay = recentSongs;
    
    if (!songsToDisplay) {
        // 如果没有传入数据，从localStorage获取
        songsToDisplay = JSON.parse(localStorage.getItem('recentSongs')) || [];
    }
    
    recentContainer.innerHTML = '';
    
    // 更新计数
    const countElement = document.getElementById('recent-count');
    if (countElement) {
        countElement.textContent = songsToDisplay.length;
    }
    
    if (songsToDisplay.length === 0) {
        recentContainer.innerHTML = '<p class="text-muted">暂无点歌记录</p>';
        return;
    }
    
    songsToDisplay.forEach(song => {
        const songCard = document.createElement('div');
        songCard.className = 'recent-song-card';
        songCard.innerHTML = `
            <div class="recent-song-info">
                <div class="recent-song-title">${song['歌名']}</div>
                <div class="recent-song-artist">${song['歌手']}</div>
                <div class="recent-time">${song['时间'] || ''}</div>
            </div>
        `;
        recentContainer.appendChild(songCard);
    });
}

// 显示提示框
function showToast(message, type = 'success') {
    // 移除已有提示框
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        toast.remove();
    });
    
    // 创建提示框元素
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.textContent = message;
    
    // 添加到页面顶部
    document.body.appendChild(toast);
    
    // 强制重绘
    toast.offsetHeight;
    
    // 显示提示框
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        
        // 完全移除元素
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500);
    }, 3000);
}

// 直播状态检测
function detectLiveStatus() {
    const liveStatus = document.getElementById('liveStatus');
    
    if (!liveStatus) return;
    
    // 检测直播状态
    const isLive = checkLiveStatus();
    
    if (isLive) {
        liveStatus.innerHTML = '<i class="bi bi-broadcast-pin"></i> 正在直播';
        liveStatus.classList.add('bg-danger', 'animate-pulse');
        liveStatus.classList.remove('bg-secondary');
    } else {
        liveStatus.innerHTML = '<i class="bi bi-mic-mute"></i> 直播结束';
        liveStatus.classList.remove('bg-danger', 'animate-pulse');
        liveStatus.classList.add('bg-secondary');
    }
    
    // 每5分钟更新一次状态
    setTimeout(detectLiveStatus, 5 * 60 * 1000);
}

// 检测直播状态
function checkLiveStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 转换为分钟数
    const currentMinutes = hours * 60 + minutes;
    
    // 定义直播时间段（14:00-15:00 和 18:00-19:30）
    const livePeriod1 = { start: 14*60, end: 15*60 };
    const livePeriod2 = { start: 18*60, end: 19*60+30 };
    
    return (currentMinutes >= livePeriod1.start && currentMinutes <= livePeriod1.end) ||
           (currentMinutes >= livePeriod2.start && currentMinutes <= livePeriod2.end);
}
