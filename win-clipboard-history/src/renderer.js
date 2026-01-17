const { ipcRenderer } = require('electron');
const moment = require('moment');

const searchInput = document.getElementById('search-input');
const historyList = document.getElementById('history-list');

let allHistory = [];
let filteredHistory = [];
let selectedIndex = 0;

// 监听主进程发来的刷新请求
ipcRenderer.on('refresh-data', () => {
  allHistory = ipcRenderer.sendSync('get-history');
  searchInput.value = '';
  filterHistory();
  searchInput.focus();
});

// 监听键盘事件
searchInput.addEventListener('input', () => {
  filterHistory();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredHistory.length - 1);
    renderList();
    ensureVisible();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderList();
    ensureVisible();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredHistory[selectedIndex]) {
      ipcRenderer.send('paste-item', filteredHistory[selectedIndex]);
    }
  } else if (e.key === 'Escape') {
    ipcRenderer.send('hide-window');
  }
});

function filterHistory() {
  const query = searchInput.value.toLowerCase();
  
  if (!query) {
    filteredHistory = allHistory;
  } else {
    filteredHistory = allHistory.filter(item => {
      if (item.type === 'text') {
        return item.content.toLowerCase().includes(query);
      }
      return false; // 图片目前不支持搜索内容
    });
  }
  
  selectedIndex = 0;
  renderList();
}

function renderList() {
  historyList.innerHTML = '';
  
  filteredHistory.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = `item ${index === selectedIndex ? 'selected' : ''}`;
    li.onclick = () => {
      selectedIndex = index;
      renderList(); // 更新选中状态
      ipcRenderer.send('paste-item', item);
    };
    li.onmouseover = () => {
        selectedIndex = index;
        // 这里不重新渲染整个列表，只改样式会更高效，但简单起见重绘
        updateSelectionStyles();
    };

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'item-icon';
    if (item.type === 'text') {
      iconDiv.textContent = 'T';
    } else {
      iconDiv.textContent = 'I';
    }
    li.appendChild(iconDiv);

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';
    if (item.type === 'text') {
        contentDiv.textContent = item.content.replace(/\n/g, ' ');
    } else if (item.type === 'image') {
        const img = document.createElement('img');
        img.src = item.content;
        img.className = 'img-preview';
        contentDiv.appendChild(img);
    }
    li.appendChild(contentDiv);

    // Meta (Time)
    const metaDiv = document.createElement('div');
    metaDiv.className = 'item-meta';
    // Format date roughly (e.g., "5m")
    metaDiv.textContent = moment(item.date).fromNow(true);
    li.appendChild(metaDiv);

    historyList.appendChild(li);
  });
}

function updateSelectionStyles() {
    const items = historyList.querySelectorAll('.item');
    items.forEach((item, index) => {
        if (index === selectedIndex) item.classList.add('selected');
        else item.classList.remove('selected');
    });
}

function ensureVisible() {
  const selectedEl = historyList.children[selectedIndex];
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

// 初始化加载
window.onload = () => {
  allHistory = ipcRenderer.sendSync('get-history');
  filterHistory();
};

