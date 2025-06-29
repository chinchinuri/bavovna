document.addEventListener('DOMContentLoaded', () => {
    // --- Глобальні елементи DOM ---
    const newsFeed = document.getElementById('news-feed');
    const mainNav = document.getElementById('main-nav');
    const tagsListContainer = document.getElementById('tags-list');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    
    // --- Елементи модального вікна (без змін) ---
    const shareModal = document.getElementById('share-modal');
    const modalClose = document.querySelector('.modal-close');
    const shareLinksContainer = document.getElementById('share-links');


    // --- Стан додатку ---
    const appState = {
        allNews: [],
        filteredNews: [],
        currentPage: 1,
        itemsPerPage: 3,
        tagFilter: null,
        searchQuery: ''
    };

    // --- Головна функція ініціалізації ---
    async function init() {
        updateActiveNav();
        
        if (newsFeed) {
            try {
                const response = await fetch('data/news.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                appState.allNews = await response.json();
                
                const urlParams = new URLSearchParams(window.location.search);
                appState.tagFilter = urlParams.get('tag');
                
                initEventListeners();
                renderApp();
                
            } catch (error) {
                newsFeed.innerHTML = '<p>Не вдалося завантажити новини. Спробуйте оновити сторінку.</p>';
                console.error('Error fetching news:', error);
            }
        }
    }

    // --- Ініціалізація обробників подій ---
    function initEventListeners() {
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            appState.searchQuery = e.target.value.toLowerCase();
            appState.currentPage = 1;
            renderApp();
        });

        document.body.addEventListener('click', handleBodyClick);

        // --- ВИПРАВЛЕНО: Повертаємо обробники для закриття модального вікна ---
        if (modalClose) modalClose.addEventListener('click', () => shareModal.style.display = 'none');
        if (shareModal) shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.style.display = 'none';
        });
    }
    
    // --- Єдиний обробник кліків ---
    function handleBodyClick(event) {
        const target = event.target;

        if (target.matches('.pagination-controls button')) {
            const page = target.dataset.page;
            if (page) {
                appState.currentPage = Number(page);
                renderApp();
                window.scrollTo(0, 0);
            }
        }

        if (target.closest('.news-article')) {
            if (target.classList.contains('read-more') && !target.classList.contains('share-button')) {
                event.preventDefault();
                const articleId = target.dataset.id;
                const content = document.getElementById(`content-${articleId}`);
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
                target.textContent = content.style.display === 'block' ? 'Згорнути' : 'Читати далі';
            }

            // --- ВИПРАВЛЕНО: Додано повну логіку для кнопки "Поділитися" ---
            if (target.classList.contains('share-button')) {
                event.preventDefault();
                const articleId = target.dataset.id;
                const articleTitle = target.dataset.title;
                const articleUrl = `${window.location.origin}${window.location.pathname}#news-${articleId}`;

                if (navigator.share) {
                    navigator.share({
                        title: articleTitle,
                        text: `Цікава новина: ${articleTitle}`,
                        url: articleUrl,
                    })
                    .catch((error) => console.log('Не вдалося поділитися:', error));
                } else {
                    showShareModal(articleTitle, articleUrl);
                }
            }
        }
    }

    // --- Рендеринг всього додатку (без змін) ---
    function renderApp() {
        let newsToProcess = [...appState.allNews];
        if (appState.tagFilter) {
            newsToProcess = newsToProcess.filter(article => article.tags.includes(appState.tagFilter));
        }
        if (appState.searchQuery) {
            newsToProcess = newsToProcess.filter(article => 
                article.title.toLowerCase().includes(appState.searchQuery) ||
                article.summary.toLowerCase().includes(appState.searchQuery)
            );
        }
        appState.filteredNews = newsToProcess;
        displayTags();
        displayNewsPage();
        displayPagination();
        initLazyLoading();
    }
    
    // --- Відображення новин (без змін) ---
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
            const tagsHTML = article.tags.map(tag => `<a href="index.html?tag=${encodeURIComponent(tag)}" class="tag-link">${tag}</a>`).join('');
            const videoHTML = article.video ? `<div class="video-container"><iframe src="${article.video}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
            const articleElement = document.createElement('article');
            articleElement.className = 'news-article';
            articleElement.id = `news-${article.id}`;
            articleElement.innerHTML = `${article.image ? `<img data-src="${article.image}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="lazy" alt="${article.title}">` : ''}<h2>${article.title}</h2><p class="meta">Опубліковано: ${new Date(article.date).toLocaleDateString('uk-UA')}</p><div class="tags-container">${tagsHTML}</div>${videoHTML}<p class="summary">${article.summary}</p><div class="full-content" id="content-${article.id}">${article.content}</div><div class="article-actions"><a href="#" class="read-more" data-id="${article.id}">Читати далі</a><a href="#" class="read-more share-button" data-id="${article.id}" data-title="${article.title}">Поділитися</a></div>`;
            newsFeed.appendChild(articleElement);
        });
    }

    // --- Відображення хмари тегів (без змін) ---
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

    // --- Відображення пагінації (без змін) ---
    function displayPagination() {
        const totalPages = Math.ceil(appState.filteredNews.length / appState.itemsPerPage);
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;
        paginationControls.innerHTML += `<button data-page="${appState.currentPage - 1}" ${appState.currentPage === 1 ? 'disabled' : ''}>Назад</button>`;
        for (let i = 1; i <= totalPages; i++) {
            paginationControls.innerHTML += `<button data-page="${i}" class="${appState.currentPage === i ? 'active' : ''}">${i}</button>`;
        }
        paginationControls.innerHTML += `<button data-page="${appState.currentPage + 1}" ${appState.currentPage === totalPages ? 'disabled' : ''}>Вперед</button>`;
    }
    
    // --- Логіка для модального вікна (без змін) ---
    function showShareModal(title, url) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        shareLinksContainer.innerHTML = `<a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Telegram"><img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram"></a><a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" title="WhatsApp"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp"></a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" title="Facebook"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook"></a><a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Twitter/X"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg" alt="Twitter/X"></a><a href="mailto:?subject=${encodedTitle}&body=Переглянь цю новину:%20${encodedUrl}" title="Email"><img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Email"></a>`;
        if (shareModal) shareModal.style.display = 'flex';
    }

    // --- Ліниве завантаження (без змін) ---
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        if ('IntersectionObserver' in window) {
            let lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        let lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.classList.remove('lazy');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });
            lazyImages.forEach(lazyImage => lazyImageObserver.observe(lazyImage));
        } else {
            lazyImages.forEach(img => { img.src = img.dataset.src; img.classList.remove('lazy'); });
        }
    }
    
    // --- Підсвітка активного пункту меню (без змін) ---
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