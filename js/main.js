document.addEventListener('DOMContentLoaded', () => {
    const newsFeed = document.getElementById('news-feed');
    const themeSwitcher = document.querySelector('.theme-switcher');
    
    // --- НОВЕ: Отримуємо елементи модального вікна ---
    const shareModal = document.getElementById('share-modal');
    const modalClose = document.querySelector('.modal-close');
    const shareLinksContainer = document.getElementById('share-links');

    // Функція для завантаження та відображення новин
    async function loadNews() {
        try {
            const response = await fetch('data/news.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const news = await response.json();
            displayNews(news);
        } catch (error) {
            newsFeed.innerHTML = '<p>Не вдалося завантажити новини. Спробуйте оновити сторінку.</p>';
            console.error('Error fetching news:', error);
        }
    }

    // Функція для створення HTML-розмітки новин
    function displayNews(news) {
        if (news.length === 0) {
            newsFeed.innerHTML = '<p>На даний момент новин немає.</p>';
            return;
        }

        newsFeed.innerHTML = '';

        news.forEach(article => {
            const articleElement = document.createElement('article');
            articleElement.className = 'news-article';
            // --- НОВЕ: Додаємо id до статті для якірних посилань ---
            articleElement.id = `news-${article.id}`; 
            articleElement.innerHTML = `
                ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ''}
                <h2>${article.title}</h2>
                <p class="meta">Опубліковано: ${new Date(article.date).toLocaleDateString('uk-UA')}</p>
                <p class="summary">${article.summary}</p>
                <div class="full-content" id="content-${article.id}">
                    ${article.content}
                </div>
                <!-- НОВЕ: Обгортка для кнопок та нова кнопка "Поділитися" -->
                <div class="article-actions">
                    <a href="#" class="read-more" data-id="${article.id}">Читати далі</a>
                    <a href="#" class="read-more share-button" data-id="${article.id}" data-title="${article.title}">Поділитися</a>
                </div>
            `;
            newsFeed.appendChild(articleElement);
        });
    }

    // Обробник подій для кнопок "Читати далі" та "Поділитися"
    newsFeed.addEventListener('click', (event) => {
        const target = event.target;

        // Кнопка "Читати далі"
        if (target.classList.contains('read-more') && !target.classList.contains('share-button')) {
            event.preventDefault();
            const articleId = target.dataset.id;
            const content = document.getElementById(`content-${articleId}`);
            
            if (content.style.display === 'block') {
                content.style.display = 'none';
                target.textContent = 'Читати далі';
            } else {
                content.style.display = 'block';
                target.textContent = 'Згорнути';
            }
        }

        // --- НОВЕ: Логіка для кнопки "Поділитися" ---
        if (target.classList.contains('share-button')) {
            event.preventDefault();
            const articleId = target.dataset.id;
            const articleTitle = target.dataset.title;
            // Створюємо унікальне посилання на новину з якорем
            const articleUrl = `${window.location.origin}${window.location.pathname}#news-${articleId}`;

            // Перевіряємо, чи підтримується Web Share API
            if (navigator.share) {
                navigator.share({
                    title: articleTitle,
                    text: `Цікава новина: ${articleTitle}`,
                    url: articleUrl,
                })
                .catch((error) => console.log('Не вдалося поділитися:', error));
            } else {
                // Якщо ні, показуємо наше модальне вікно
                showShareModal(articleTitle, articleUrl);
            }
        }
    });

    // --- НОВЕ: Функції для керування модальним вікном ---
    function showShareModal(title, url) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);

        shareLinksContainer.innerHTML = `
            <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Telegram">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram">
            </a>
            <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" title="WhatsApp">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp">
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" title="Facebook">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook">
            </a>
            <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" title="Twitter/X">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg" alt="Twitter/X">
            </a>
            <a href="mailto:?subject=${encodedTitle}&body=Переглянь цю новину:%20${encodedUrl}" title="Email">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Email">
            </a>
        `;
        shareModal.style.display = 'flex';
    }

    function hideShareModal() {
        shareModal.style.display = 'none';
    }

    // Закриття модального вікна при кліку на кнопку або на фон
    modalClose.addEventListener('click', hideShareModal);
    shareModal.addEventListener('click', (event) => {
        if (event.target === shareModal) {
            hideShareModal();
        }
    });


    // --- Керування темами (без змін) ---
    const themeButtons = themeSwitcher.querySelectorAll('button');
    const body = document.body;
    
    function applyTheme(theme) {
        body.className = '';
        if (theme !== 'light') {
            body.classList.add(`theme-${theme}`);
        }
        localStorage.setItem('news-theme', theme);
        themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    }
    
    themeSwitcher.addEventListener('click', (event) => {
        if(event.target.tagName === 'BUTTON') {
            applyTheme(event.target.dataset.theme);
        }
    });

    const savedTheme = localStorage.getItem('news-theme') || 'light';
    applyTheme(savedTheme);

    // Запускаємо завантаження новин
    loadNews();
});
