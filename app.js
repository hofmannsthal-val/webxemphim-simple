'use strict';

const STORAGE_KEY = 'kdramaList_v2';

const form = document.getElementById('movie-form');
const titleInput = document.getElementById('movie-title');
const linkInput = document.getElementById('movie-link');
const list = document.getElementById('movie-list');
const emptyMessage = document.getElementById('empty-msg');
const formMessage = document.getElementById('form-message');

let movies = loadMovies();

function showMessage(message, type = '') {
    formMessage.textContent = message;
    formMessage.className = `form-message${type ? ` ${type}` : ''}`;
}

function normalizeLink(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return '';
    }

    const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`;
    const url = new URL(candidate);

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
    }

    return url.href;
}

function isMovie(value) {
    return value
        && (typeof value.id === 'string' || typeof value.id === 'number')
        && typeof value.title === 'string'
        && typeof value.completed === 'boolean';
}

function loadMovies() {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            throw new Error('invalid storage shape');
        }

        return parsedValue.filter(isMovie).map((movie) => {
            let link = '';
            try {
                link = movie.link && movie.link !== '#' ? normalizeLink(String(movie.link)) : '';
            } catch {
                link = '';
            }

            return {
                id: movie.id,
                title: movie.title.slice(0, 200),
                link,
                completed: movie.completed,
                date: typeof movie.date === 'string' ? movie.date : ''
            };
        });
    } catch {
        queueMicrotask(() => showMessage('Dữ liệu đã lưu không hợp lệ. Danh sách tạm thời được đặt lại.', 'error'));
        return [];
    }
}

function saveMovies() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
        return true;
    } catch {
        showMessage('Không thể lưu trên trình duyệt này. Thay đổi chỉ tồn tại trong phiên hiện tại.', 'error');
        return false;
    }
}

function createLink(href, className, label) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = className;
    link.textContent = label;
    return link;
}

function createMovieItem(movie) {
    const item = document.createElement('li');
    const header = document.createElement('div');
    const details = document.createElement('div');
    const title = document.createElement('span');
    const actions = document.createElement('div');

    header.className = 'movie-header';
    details.className = 'movie-details';
    title.className = `movie-title${movie.completed ? ' completed' : ''}`;
    title.textContent = movie.title;
    actions.className = 'actions';

    details.appendChild(title);

    if (movie.link) {
        details.appendChild(createLink(movie.link, 'movie-link-display', `🔗 ${movie.link}`));
        actions.appendChild(createLink(movie.link, 'btn-watch', '▶ Xem Phim'));
    } else {
        const missingLink = document.createElement('span');
        const disabledWatchButton = document.createElement('button');
        missingLink.className = 'movie-link-display movie-link-missing';
        missingLink.textContent = 'Chưa có link';
        disabledWatchButton.type = 'button';
        disabledWatchButton.className = 'btn-watch';
        disabledWatchButton.disabled = true;
        disabledWatchButton.textContent = 'Chưa có link';
        details.appendChild(missingLink);
        actions.appendChild(disabledWatchButton);
    }

    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = `btn-status${movie.completed ? ' completed' : ''}`;
    statusButton.textContent = '✓';
    statusButton.setAttribute('aria-pressed', String(movie.completed));
    statusButton.setAttribute('aria-label', movie.completed ? `Đánh dấu chưa xem: ${movie.title}` : `Đánh dấu đã xem: ${movie.title}`);
    statusButton.addEventListener('click', () => toggleStatus(movie.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = '✕';
    deleteButton.setAttribute('aria-label', `Xóa phim: ${movie.title}`);
    deleteButton.addEventListener('click', () => deleteMovie(movie.id));

    actions.append(statusButton, deleteButton);
    header.appendChild(details);
    item.append(header, actions);
    return item;
}

function render() {
    list.replaceChildren(...movies.map(createMovieItem));
    emptyMessage.hidden = movies.length !== 0;
}

function addMovie(event) {
    event.preventDefault();
    showMessage('');

    const title = titleInput.value.trim();
    if (!title) {
        showMessage('Vui lòng nhập tên phim.', 'error');
        titleInput.focus();
        return;
    }

    let link;
    try {
        link = normalizeLink(linkInput.value);
    } catch {
        showMessage('Liên kết không hợp lệ. Chỉ chấp nhận địa chỉ HTTP hoặc HTTPS.', 'error');
        linkInput.focus();
        return;
    }

    movies.unshift({
        id: crypto.randomUUID(),
        title,
        link,
        completed: false,
        date: new Date().toLocaleDateString('vi-VN')
    });

    const saved = saveMovies();
    render();
    form.reset();
    titleInput.focus();
    if (saved) {
        showMessage('Đã thêm phim.', 'success');
    }
}

function deleteMovie(id) {
    const movie = movies.find((item) => item.id === id);
    if (!movie || !window.confirm(`Xóa phim “${movie.title}”?`)) {
        return;
    }

    movies = movies.filter((item) => item.id !== id);
    saveMovies();
    render();
}

function toggleStatus(id) {
    movies = movies.map((movie) => movie.id === id
        ? { ...movie, completed: !movie.completed }
        : movie);
    saveMovies();
    render();
}

form.addEventListener('submit', addMovie);
titleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        linkInput.focus();
    }
});

render();
