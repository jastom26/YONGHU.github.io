// 全局变量存储歌曲数据
let allSongs = [];
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
            this.timer = setTimeout(searchSongs, 300);
        });
    }
    
    // 初始化加载歌曲
    loadSongs();
});

// 加载歌曲数据
async function loadSongs() {
    try {
        const loading = document.getElementById('loading');
        const songTable = document.getElementById('songTable');
        const randomButton = document.getElementById('randomButton');
        const searchInput = document.getElementById('searchInput');
        
        // 显示加载状态
        if (loading) loading.style.display = 'block';
        if (songTable) songTable.style.display = 'none';
        if (randomButton) randomButton.disabled = true;
        if (searchInput) searchInput.disabled = true;
        
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
        
        // 更新UI
        if (loading) loading.style.display = 'none';
        if (songTable) songTable.style.display = 'table';
        if (randomButton) randomButton.disabled = false;
        if (searchInput) searchInput.disabled = false;
        
        displaySongs(allSongs);
        
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${song['歌名'] || '-'}</td>
            <td>${song['歌手'] || '-'}</td>
            <td>${song['风格'] || '-'}</td>
            <td>${song['链接'] ? `<a href="${song['链接']}" target="_blank">链接</a>` : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// 搜索功能
function searchSongs() {
    if (!allSongs.length) return;
    
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const input = searchInput.value.trim().toLowerCase();
    
    if (input === '') {
        displaySongs(allSongs);
        return;
    }
    
    const filteredSongs = allSongs.filter(song => {
        const songName = (song['歌名'] || '').toLowerCase();
        const artist = (song['歌手'] || '').toLowerCase();
        const genre = (song['风格'] || '').toLowerCase();
        
        return songName.includes(input) || 
               artist.includes(input) || 
               genre.includes(input);
    });
    
    displaySongs(filteredSongs);
}

// 复制随机歌曲到剪贴板并显示提示框
function copyRandomSong() {
    if (!allSongs.length) {
        showToast('歌单为空，无法随机选择', 'error');
        return;
    }
    
    // 随机选择一首歌
    const randomIndex = Math.floor(Math.random() * allSongs.length);
    const randomSong = allSongs[randomIndex];
    
    // 创建复制内容
    const songInfo = `${randomSong['歌名'] || '未知歌曲'} - ${randomSong['歌手'] || '未知歌手'}`;
    
    // 使用现代API尝试复制
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(songInfo)
            .then(() => {
                showToast('已复制: ' + songInfo);
            })
            .catch(err => {
                console.error('复制失败:', err);
                showToast('复制失败，请手动复制: ' + songInfo, 'error');
            });
    } else {
        // 使用兼容性方法
        try {
            const textArea = document.createElement('textarea');
            textArea.value = songInfo;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                showToast('已复制: ' + songInfo);
            } else {
                throw new Error('复制命令失败');
            }
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制: ' + songInfo, 'error');
        }
    }
}

// 显示提示框 (确保此函数在任何情况下都能工作)
function showToast(message, type = 'success') {
    // 移除已有提示框
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        toast.parentNode.removeChild(toast);
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
                document.body.removeChild(toast);
            }
        }, 500);
    }, 3000);
}
