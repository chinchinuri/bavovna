document.addEventListener('DOMContentLoaded', () => {
    // --- Глобальні елементи DOM ---
    const newsFeed = document.getElementById('news-feed');
    const mainNav = document.getElementById('main-nav');
    const tagsListContainer = document.getElementById('tags-list');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');

    // --- Стан додатку ---
    const appState = {
        allNews: [],
        filteredNews: [],
        currentPage: 1,
        itemsPerPage: 3, // Кількість новин на сторінці
        tagFilter: null,
        searchQuery: ''
    };

    // --- Головна функція ініціалізації ---
    async function init() {
        updateActiveNav();
        
        // Виконуємо логіку тільки для головної сторінки
        if (newsFeed) {
            try {
                const response = await fetch('data/news.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                appState.allNews = await response.json();
                
                // Отримуємо параметри з URL
                const urlParams = new URLSearchParams(window.location.search);
                appState.tagFilter = urlParams.get('tag');
                
                initEventListeners();
                renderApp(); // Перший рендер
                
            } catch (error) {
                newsFeed.innerHTML = '<p>Не вдалося завантажити новини. Спробуйте оновити сторінку.</p>';
                console.error('Error fetching news:', error);
            }
        }
    }

    // --- Ініціалізація обробників подій ---
    function initEventListeners() {
        // Пошук
        searchInput.addEventListener('input', (e) => {
            appState.searchQuery = e.target.value.toLowerCase();
            appState.currentPage = 1; // Скидаємо на першу сторінку при пошуку
            renderApp();
        });

        // Кліки на кнопки (делегування)
        document.body.addEventListener('click', handleBodyClick);
    }
    
    // --- Єдиний обробник кліків ---
    function handleBodyClick(event) {
        const target = event.target;

        // Кнопки пагінації
        if (target.matches('.pagination-controls button')) {
            const page = target.dataset.page;
            if (page) {
                appState.currentPage = Number(page);
                renderApp();
                window.scrollTo(0, 0);
            }
        }

        // Кнопки в картці новини
        if (target.closest('.news-article')) {
            if (target.classList.contains('read-more') && !target.classList.contains('share-button')) {
                event.preventDefault();
                const articleId = target.dataset.id;
                const content = document.getElementById(`content-${articleId}`);
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
                target.textContent = content.style.display === 'block' ? 'Згорнути' : 'Читати далі';
            }

            if (target.classList.contains('share-button')) {
                event.preventDefault();
                // Логіка поширення (без змін)
            }
        }
    }

    // --- Рендеринг всього додатку ---
    function renderApp() {
        // 1. Фільтрація
        let newsToProcess = [...appState.allNews];
        
        // Фільтр за тегом
        if (appState.tagFilter) {
            newsToProcess = newsToProcess.filter(article => article.tags.includes(appState.tagFilter));
        }

        // Фільтр за пошуковим запитом
        if (appState.searchQuery) {
            newsToProcess = newsToProcess.filter(article => 
                article.title.toLowerCase().includes(appState.searchQuery) ||
                article.summary.toLowerCase().includes(appState.searchQuery)
            );
        }
        
        appState.filteredNews = newsToProcess;
        
        // 2. Рендеримо компоненти
        displayTags();
        displayNewsPage();
        displayPagination();
        initLazyLoading();
    }
    
    // --- Відображення новин (поточної сторінки) ---
    function displayNewsPage() {
        newsFeed.innerHTML = '';
        if (appState.filteredNews.length === 0) {
            newsFeed.innerHTML = '<p>Новин, що відповідають вашому запиту, не знайдено.</p>';
            return;
        }

        const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
        const endIndex = startIndex + appState.itemsPerPage;
        const pageItems = appState.filteredNews.slice(startIndex, endIndex);

        pageItems.forEach(article => {
            const tagsHTML = article.tags.map(tag => 
                `<a href="index.html?tag=${encodeURIComponent(tag)}" class="tag-link">${tag}</a>`
            ).join('');
            
            const videoHTML = article.video 
                ? `<div class="video-container"><iframe src="${article.video}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` 
                : '';

            const articleElement = document.createElement('article');
            articleElement.className = 'news-article';
            articleElement.id = `news-${article.id}`;
            articleElement.innerHTML = `
                ${article.image ? `<img data-src="${article.image}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="lazy" alt="${article.title}">` : ''}
                <h2>${article.title}</h2>
                <p class="meta">Опубліковано: ${new Date(article.date).toLocaleDateString('uk-UA')}</p>
                <div class="tags-container">${tagsHTML}</div>
                ${videoHTML}
                <p class="summary">${article.summary}</p>
                <div class="full-content" id="content-${article.id}">${article.content}</div>
                <div class="article-actions">
                    <a href="#" class="read-more" data-id="${article.id}">Читати далі</a>
                    <a href="#" class="read-more share-button" data-id="${article.id}" data-title="${article.title}">Поділитися</a>
                </div>
            `;
            newsFeed.appendChild(articleElement);
        });
    }

    // --- Відображення хмари тегів ---
    function displayTags() {
        const allTags = appState.allNews.flatMap(article => article.tags);
        const uniqueTags = [...new Set(allTags)].sort();
        let tagsHTML = `<a href="index.html" class="tag-link all-tags ${!appState.tagFilter ? 'active' : ''}">Всі новини</a>`;
        uniqueTags.forEach(tag => {
            const isActive = tag === appState.tagFilter ? 'active' : '';
            tagsHTML += `<a href="index.html?tag=${encodeURIComponent(tag)}" class="tag-link ${isActive}">${tag}</a>`;
        });
        tagsListContainer.innerHTML = tagsHTML;
    }

    // --- Відображення пагінації ---
    function displayPagination() {
        const totalPages = Math.ceil(appState.filteredNews.length / appState.itemsPerPage);
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        // Кнопка "Назад"
        paginationControls.innerHTML += `<button data-page="${appState.currentPage - 1}" ${appState.currentPage === 1 ? 'disabled' : ''}>Назад</button>`;
        
        // Кнопки з номерами сторінок
        for (let i = 1; i <= totalPages; i++) {
            paginationControls.innerHTML += `<button data-page="${i}" class="${appState.currentPage === i ? 'active' : ''}">${i}</button>`;
        }
        
        // Кнопка "Вперед"
        paginationControls.innerHTML += `<button data-page="${appState.currentPage + 1}" ${appState.currentPage === totalPages ? 'disabled' : ''}>Вперед</button>`;
    }

    // --- Ліниве завантаження зображень ---
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        if ('IntersectionObserver' in window) {
            let lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        let lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.classList.remove('lazy');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });
            lazyImages.forEach((lazyImage) => {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback для старих браузерів
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }
    
    // --- Підсвітка активного пункту меню ---
    function updateActiveNav() {
        if (!mainNav) return;
        const navLinks = mainNav.querySelectorAll('a');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop() || 'index.html';
            if (linkPage === currentPage) link.classList.add('active');
        });
    }

    // --- ЗАПУСК ---
    init();
});