// Google Drive 文件夹ID - 您需要替换为您自己的文件夹ID
const DRIVE_FOLDER_ID = '1mPUfznIFA-aKEM-u_at0OonDh7z6FxJa';
const API_KEY = 'AIzaSyA0rc41VTOL4OB1uto2OPXgljE1xHNGVcc'; 

// 全局变量
let currentSongIndex = -1; // -1表示没有歌曲被选中
let songs = [];
let isPlaying = false;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件
    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('prevBtn').addEventListener('click', playPrev);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('coverSearch').addEventListener('input', filterSongs);
    
    // 加载翻唱歌曲
    loadCoverSongs();
    
    // 检查是否有预设的搜索词
    const searchTerm = sessionStorage.getItem('coverSearch');
    if (searchTerm) {
        document.getElementById('coverSearch').value = searchTerm;
        filterSongs.call(document.getElementById('coverSearch'));
        sessionStorage.removeItem('coverSearch');
    }
});

// 从Google Drive加载歌曲列表
async function loadCoverSongs() {
    try {
        // 显示加载指示器
        document.getElementById('loadingIndicator').style.display = 'block';
        
        // 使用Google Drive API获取歌曲列表
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=%27${DRIVE_FOLDER_ID}%27+in+parents&fields=files(id,name,webContentLink,createdTime)&key=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`Google Drive API错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        songs = data.files
            .filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return ['mp3', 'm4a', 'ogg', 'wav'].includes(ext);
            })
            .map(file => ({
                id: file.id,
                title: file.name.replace(/\.[^/.]+$/, ""), // 移除扩展名
                embedUrl: `https://drive.google.com/file/d/${file.id}/preview`,
                downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
                date: new Date(file.createdTime).toLocaleDateString('zh-CN')
            }));
        
        // 渲染歌曲列表
        renderSongs(songs);
        
        // 隐藏加载指示器
        document.getElementById('loadingIndicator').style.display = 'none';
        
    } catch (error) {
        console.error('加载歌曲失败:', error);
        document.getElementById('loadingIndicator').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> 加载失败: ${error.message || '未知错误'}
                <p class="mt-2">请检查: </p>
                <ul>
                    <li>Google Drive文件夹ID是否正确</li>
                    <li>API密钥是否正确</li>
                    <li>文件夹是否设置为公开</li>
                </ul>
            </div>
            <button class="btn btn-secondary mt-2" onclick="location.reload()">重新加载</button>
        `;
    }
}

// 渲染歌曲列表
function renderSongs(songList) {
    const container = document.getElementById('coversList');
    
    // 清除加载指示器
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // 清空容器
    container.innerHTML = '';
    
    if (songList.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-music-note-beamed display-4 text-muted mb-3"></i>
                <h5>暂无翻唱作品</h5>
                <p>枝枝正在准备更多精彩翻唱，敬请期待~</p>
                <button class="btn btn-purple mt-2" onclick="loadCoverSongs()">
                    <i class="bi bi-arrow-repeat"></i> 重新加载
                </button>
            </div>
        `;
        return;
    }
    
    songList.forEach((song, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        col.innerHTML = `
            <div class="cover-card card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">${song.title}</h5>
                        <span class="badge bg-purple">${song.date}</span>
                    </div>
                    <div class="d-flex justify-content-between mt-auto">
                        <button class="btn btn-sm btn-purple play-btn" data-index="${index}">
                            <i class="bi bi-play-fill"></i> 播放
                        </button>
                        <a href="${song.downloadUrl}" class="btn btn-sm btn-outline-purple" download="${song.title}.mp3">
                            <i class="bi bi-download"></i> 下载
                        </a>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
    
    // 添加播放按钮事件
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            playSong(index);
        });
    });
}

// 播放指定歌曲（优化版）
function playSong(index) {
    if (index < 0 || index >= songs.length) return;
    
    currentSongIndex = index;
    const song = songs[index];
    
    // 更新UI
    document.getElementById('currentSongTitle').textContent = song.title;
    document.getElementById('currentSongArtist').textContent = 'SL.枝今山';
    document.getElementById('playStatus').textContent = '加载中...';
    
    // 创建嵌入式播放器并自动播放
    const container = document.getElementById('audioPlayerContainer');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-purple" role="status"></div><p class="mt-2">加载音频中...</p></div>';
    
    setTimeout(() => {
        container.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.src = `${song.embedUrl}?autoplay=1`; // 添加自动播放参数
        iframe.frameborder = "0";
        iframe.allow = "autoplay; fullscreen";
        iframe.className = "audio-iframe";
        
        // 监听加载完成事件
        iframe.onload = function() {
            document.getElementById('playStatus').textContent = '播放中';
            document.getElementById('playIcon').className = 'bi bi-pause-fill';
            isPlaying = true;
            updatePlayButtonState();
        };
        
        container.appendChild(iframe);
        
        // 更新播放按钮状态
        updatePlayButtonState();
    }, 300);
}

// 更新播放按钮状态
function updatePlayButtonState() {
    document.querySelectorAll('.play-btn').forEach((btn, index) => {
        const icon = btn.querySelector('i');
        if (index === currentSongIndex && isPlaying) {
            btn.classList.add('active');
            icon.className = 'bi bi-pause-fill';
        } else {
            btn.classList.remove('active');
            icon.className = 'bi bi-play-fill';
        }
    });
}

// 切换播放/暂停
function togglePlay() {
    if (currentSongIndex === -1) {
        // 如果没有歌曲被选中，播放第一首
        if (songs.length > 0) {
            playSong(0);
        }
        return;
    }
    
    if (isPlaying) {
        // 暂停播放
        const container = document.getElementById('audioPlayerContainer');
        container.innerHTML = '<div class="text-center py-3 text-muted"><i class="bi bi-music-player fs-1"></i><p>播放已停止</p></div>';
        document.getElementById('playIcon').className = 'bi bi-play-fill';
        document.getElementById('playStatus').textContent = '停止';
        isPlaying = false;
    } else {
        // 继续播放
        const song = songs[currentSongIndex];
        playSong(currentSongIndex);
    }
    
    updatePlayButtonState();
}

// 播放上一首
function playPrev() {
    let newIndex = currentSongIndex - 1;
    if (newIndex < 0) newIndex = songs.length - 1;
    playSong(newIndex);
}

// 播放下一首
function playNext() {
    let newIndex = currentSongIndex + 1;
    if (newIndex >= songs.length) newIndex = 0;
    playSong(newIndex);
}

// 过滤歌曲
function filterSongs() {
    const searchTerm = this.value.toLowerCase().trim();
    if (searchTerm === '') {
        renderSongs(songs);
    } else {
        const filteredSongs = songs.filter(song => 
            song.title.toLowerCase().includes(searchTerm)
        );
        renderSongs(filteredSongs);
        
        // 如果有搜索结果且只有一个匹配项，自动播放
        if (filteredSongs.length === 1) {
            setTimeout(() => {
                playSong(0);
            }, 500);
        }
    }
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
