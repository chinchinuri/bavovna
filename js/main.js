document.addEventListener('DOMContentLoaded', () => {
    // --- Елементи DOM ---
    const newsFeed = document.getElementById('news-feed');
    const mainNav = document.getElementById('main-nav');
    const tagsListContainer = document.getElementById('tags-list');
    const shareModal = document.getElementById('share-modal');
    const modalClose = document.querySelector('.modal-close');
    const shareLinksContainer = document.getElementById('share-links');
    
    // --- Глобальна змінна для зберігання всіх новин ---
    let allNewsData = [];

    // --- Функції ---

    // 1. Головна функція завантаження
    async function loadContent() {
        updateActiveNav(); // Підсвічуємо активний пункт меню

        // Завантажуємо новини та теги тільки на головній сторінці
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            try {
                const response = await fetch('data/news.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                allNewsData = await response.json();
                
                const urlParams = new URLSearchParams(window.location.search);
                const tagFilter = urlParams.get('tag');

                displayTags(allNewsData, tagFilter);
                
                const filteredNews = tagFilter 
                    ? allNewsData.filter(article => article.tags.includes(tagFilter))
                    : allNewsData;
                
                displayNews(filteredNews);

            } catch (error) {
                if(newsFeed) newsFeed.innerHTML = '<p>Не вдалося завантажити новини. Спробуйте оновити сторінку.</p>';
                console.error('Error fetching news:', error);
            }
        }
    }

    // 2. Відображення новин
    function displayNews(news) {
        if (!newsFeed) return;
        
        if (news.length === 0) {
            newsFeed.innerHTML = '<p>Новин за цим тегом не знайдено.</p>';
            return;
        }

        newsFeed.innerHTML = '';
        news.forEach(article => {
            const articleElement = document.createElement('article');
            articleElement.className = 'news-article';
            articleElement.id = `news-${article.id}`; 
            
            // Створюємо HTML для тегів
            const tagsHTML = article.tags.map(tag => 
                `<a href="index.html?tag=${encodeURIComponent(tag)}" class="tag-link">${tag}</a>`
            ).join('');

            articleElement.innerHTML = `
                ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ''}
                <h2>${article.title}</h2>
                <p class="meta">Опубліковано: ${new Date(article.date).toLocaleDateString('uk-UA')}</p>
                <div class="tags-container">${tagsHTML}</div>
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

    // 3. Відображення хмари тегів
    function displayTags(news, activeTag) {
        if (!tagsListContainer) return;

        const allTags = news.flatMap(article => article.tags);
        const uniqueTags = [...new Set(allTags)].sort();

        let tagsHTML = `<a href="index.html" class="tag-link all-tags ${!activeTag ? 'active' : ''}">Всі новини</a>`;
        
        uniqueTags.forEach(tag => {
            const isActive = tag === activeTag ? 'active' : '';
            tagsHTML += `<a href="index.html?tag=${encodeURIComponent(tag)}" class="tag-link ${isActive}">${tag}</a>`;
        });

        tagsListContainer.innerHTML = tagsHTML;
    }

    // 4. Підсвітка активного пункту меню
    function updateActiveNav() {
        if (!mainNav) return;
        const navLinks = mainNav.querySelectorAll('a');
        const currentPage = window.location.pathname.split('/').pop();

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();
            if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // --- Обробники подій ---

    // 1. Кліки в стрічці новин ("Читати далі", "Поділитися")
    if (newsFeed) {
        newsFeed.addEventListener('click', (event) => {
            const target = event.target;
            event.preventDefault(); // Запобігаємо переходу за посиланням для всіх кнопок

            if (target.classList.contains('read-more') && !target.classList.contains('share-button')) {
                const articleId = target.dataset.id;
                const content = document.getElementById(`content-${articleId}`);
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
                target.textContent = content.style.display === 'block' ? 'Згорнути' : 'Читати далі';
            }

            if (target.classList.contains('share-button')) {
                const articleId = target.dataset.id;
                const articleTitle = target.dataset.title;
                const articleUrl = `${window.location.origin}${window.location.pathname}#news-${articleId}`;

                if (navigator.share) {
                    navigator.share({ title: articleTitle, text: `Цікава новина: ${articleTitle}`, url: articleUrl })
                        .catch((error) => console.log('Не вдалося поділитися:', error));
                } else {
                    showShareModal(articleTitle, articleUrl);
                }
            }
        });
    }

    // 2. Керування модальним вікном поширення
    function showShareModal(title, url) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        shareLinksContainer.innerHTML = `<a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Telegram"><img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram"></a><a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" title="WhatsApp"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp"></a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" title="Facebook"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook"></a><a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Twitter/X"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg" alt="Twitter/X"></a><a href="mailto:?subject=${encodedTitle}&body=Переглянь цю новину:%20${encodedUrl}" title="Email"><img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Email"></a>`;
        if (shareModal) shareModal.style.display = 'flex';
    }

    if (modalClose) modalClose.addEventListener('click', () => shareModal.style.display = 'none');
    if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.style.display = 'none'; });

    // --- Запуск ---
    loadContent();
});