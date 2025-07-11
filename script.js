// 检测直播状态
function checkLiveStatus() {
    fetch('http://localhost:5000/live-status')
        .then(response => response.json())
        .then(data => {
            const indicator = document.getElementById('live-status');
            
            if (data.error) {
                indicator.textContent = '直播检测失败';
                indicator.className = 'live-indicator offline';
                return;
            }
            
            if (data.is_live) {
                indicator.innerHTML = '<span class="status-dot"></span> 正在直播';
                indicator.className = 'live-indicator live';
            } else {
                indicator.innerHTML = '<span class="status-dot"></span> 未开播';
                indicator.className = 'live-indicator offline';
            }
        })
        .catch(error => {
            console.error('检测直播状态失败:', error);
            const indicator = document.getElementById('live-status');
            indicator.textContent = '直播检测服务未启动';
            indicator.className = 'live-indicator offline';
        });
}

// 初始检测
checkLiveStatus();

// 每30秒检测一次
setInterval(checkLiveStatus, 30000);

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 主页初始化代码
    if (document.getElementById('home-page')) {
        // 主页特定初始化
    }
    
    // 歌单页初始化代码
    if (document.getElementById('song-list-page')) {
        // 加载音频波动效果
        const audioWave = document.createElement('script');
        audioWave.src = 'audio_wave.js';
        document.head.appendChild(audioWave);
        
        // 初始化播放器
        initPlayer();
    }
});

// 初始化播放器
function initPlayer() {
    const player = document.getElementById('music-player');
    
    player.addEventListener('play', function() {
        toggleAudioWave(true);
    });
    
    player.addEventListener('pause', function() {
        toggleAudioWave(false);
    });
    
    player.addEventListener('ended', function() {
        toggleAudioWave(false);
    });
}

// 切换音频波动效果
function toggleAudioWave(show) {
    const wave = document.getElementById('audio-wave');
    if (wave) {
        wave.style.display = show ? 'flex' : 'none';
    }
}
