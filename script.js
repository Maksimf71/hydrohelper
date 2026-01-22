// Главный объект приложения
const HydroHelper = {
    // Текущий пользователь
    currentUser: null,
    users: [],
    
    // Данные для конструктора
    userSelections: {
        plant: null,
        location: null,
        budget: null
    },
    
    // Статистика
    stats: {
        diagnosticCount: 0,
        calculatorCount: 0,
        plansSaved: 0
    },
    
    // Инициализация приложения
    init: function() {
        this.loadData();
        this.checkAuth();
        this.setupEventListeners();
        this.setupWizard();
        this.setupDiagnostic();
        this.setupCalculator();
        this.setupLightCalculator();
        this.setupChecklist();
        this.setupAuth();
        this.setupProfile();
        this.setupKnowledgeBase();
        
        // Прокрутка по якорным ссылкам
        this.setupSmoothScroll();
        
        // Обновляем отображение
        this.updatePlantsDisplay();
        this.updateChecklistProgress();
        
        // Загружаем статистику
        this.loadStats();
    },
    
    // Загрузка всех данных
    loadData: function() {
        // Загружаем пользователей
        const usersJson = localStorage.getItem('hydroHelperUsers');
        this.users = usersJson ? JSON.parse(usersJson) : [];
        
        // Загружаем статистику
        const statsJson = localStorage.getItem('hydroHelperStats');
        this.stats = statsJson ? JSON.parse(statsJson) : this.stats;
    },
    
    // Сохранение данных
    saveData: function() {
        localStorage.setItem('hydroHelperUsers', JSON.stringify(this.users));
        localStorage.setItem('hydroHelperStats', JSON.stringify(this.stats));
    },
    
    // Сохранение статистики
    saveStats: function() {
        localStorage.setItem('hydroHelperStats', JSON.stringify(this.stats));
    },
    
    // Загрузка статистики
    loadStats: function() {
        const statsJson = localStorage.getItem('hydroHelperStats');
        if (statsJson) {
            this.stats = JSON.parse(statsJson);
        }
    },
    
    // Проверка авторизации
    checkAuth: function() {
        const currentUserId = localStorage.getItem('hydroHelperCurrentUser');
        if (currentUserId) {
            this.currentUser = this.users.find(user => user.id === currentUserId);
            this.updateAuthUI();
        }
    },
    
    // Плавная прокрутка
    setupSmoothScroll: function() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#' || targetId === '#!') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    },
    
    // Настройка аутентификации
    setupAuth: function() {
        const authModal = document.getElementById('auth-modal');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const heroAuthBtn = document.getElementById('hero-auth-btn');
        const authClose = document.querySelector('.auth-close');
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authFromJournal = document.getElementById('auth-from-journal');
        const forgotPassword = document.getElementById('forgot-password');
        
        // Открытие модального окна аутентификации
        const openAuthModal = (tab = 'login') => {
            authModal.classList.remove('hidden');
            document.querySelector(`[data-tab="${tab}"]`).click();
        };
        
        loginBtn.addEventListener('click', () => openAuthModal('login'));
        registerBtn.addEventListener('click', () => openAuthModal('register'));
        heroAuthBtn.addEventListener('click', () => openAuthModal('register'));
        
        if (authFromJournal) {
            authFromJournal.addEventListener('click', () => openAuthModal('login'));
        }
        
        // Закрытие модального окна
        authClose.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
        
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.add('hidden');
            }
        });
        
        // Переключение вкладок
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                // Убираем активный класс у всех вкладок
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Показываем соответствующую форму
                document.querySelectorAll('.auth-form').forEach(form => {
                    form.classList.remove('active');
                });
                document.getElementById(`${tabName}-form`).classList.add('active');
            });
        });
        
        // Обработка формы входа
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const user = this.users.find(u => u.email === email && u.password === password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('hydroHelperCurrentUser', user.id);
                this.updateAuthUI();
                authModal.classList.add('hidden');
                this.showNotification(`Добро пожаловать, ${user.name}!`, 'success');
                
                // Перенос растений из локального хранилища в аккаунт
                this.migratePlantsToAccount();
            } else {
                this.showNotification('Неверный email или пароль', 'error');
            }
        });
        
        // Обработка формы регистрации
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            
            // Проверка паролей
            if (password !== confirmPassword) {
                this.showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            // Проверка существующего пользователя
            if (this.users.find(u => u.email === email)) {
                this.showNotification('Пользователь с таким email уже существует', 'error');
                return;
            }
            
            // Создание нового пользователя
            const newUser = {
                id: Date.now().toString(),
                name: name,
                email: email,
                password: password,
                joinDate: new Date().toISOString(),
                plants: [],
                savedPlans: [],
                diagnosticHistory: [],
                stats: {
                    totalPlants: 0,
                    successfulPlants: 0,
                    calculatorUses: 0,
                    diagnosticUses: 0,
                    level: 'Новичок'
                },
                achievements: {
                    firstPlant: false,
                    fivePlants: false,
                    oneMonth: false,
                    tenCalculations: false,
                    firstDiagnostic: false
                }
            };
            
            this.users.push(newUser);
            this.saveData();
            
            this.currentUser = newUser;
            localStorage.setItem('hydroHelperCurrentUser', newUser.id);
            
            this.updateAuthUI();
            authModal.classList.add('hidden');
            this.showNotification('Регистрация успешна! Добро пожаловать!', 'success');
            
            // Очистка формы
            registerForm.reset();
        });
        
        // Восстановление пароля
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Функция восстановления пароля пока недоступна', 'info');
            });
        }
        
        // Кнопка выхода
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.currentUser = null;
                localStorage.removeItem('hydroHelperCurrentUser');
                this.updateAuthUI();
                this.showNotification('Вы вышли из аккаунта', 'info');
            });
        }
    },
    
    // Настройка личного кабинета
    setupProfile: function() {
        const profileModal = document.getElementById('profile-modal');
        const userMenu = document.getElementById('user-menu');
        const usernameDisplay = document.getElementById('username-display');
        const profileClose = document.querySelector('.profile-close');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const exportDataBtn = document.getElementById('export-data-btn');
        
        // Открытие личного кабинета
        const openProfile = () => {
            if (!this.currentUser) {
                this.showNotification('Войдите в аккаунт', 'error');
                return;
            }
            
            this.updateProfileData();
            profileModal.classList.remove('hidden');
        };
        
        if (userMenu) {
            userMenu.addEventListener('click', (e) => {
                if (e.target === usernameDisplay || e.target.closest('#username-display')) {
                    openProfile();
                }
            });
        }
        
        // Закрытие личного кабинета
        if (profileClose) {
            profileClose.addEventListener('click', () => {
                profileModal.classList.add('hidden');
            });
        }
        
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.add('hidden');
            }
        });
        
        // Редактирование профиля
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.editProfile();
            });
        }
        
        // Экспорт данных
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }
    },
    
    // Обновление данных в личном кабинете
    updateProfileData: function() {
        if (!this.currentUser) return;
        
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('plants-count').textContent = this.currentUser.plants ? this.currentUser.plants.length : 0;
        
        // Расчет дней активности
        const joinDate = new Date(this.currentUser.joinDate);
        const today = new Date();
        const daysActive = Math.max(1, Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)));
        document.getElementById('days-active').textContent = daysActive;
        
        // Уровень пользователя
        document.getElementById('user-level').textContent = this.currentUser.stats.level;
        
        // Статистика
        document.getElementById('successful-plants').textContent = 
            this.currentUser.stats.successfulPlants || 0;
        
        // Общее количество фото
        const totalPhotos = this.currentUser.plants ? 
            this.currentUser.plants.reduce((sum, plant) => sum + (plant.photos ? plant.photos.length : 0), 0) : 0;
        document.getElementById('total-photos').textContent = totalPhotos;
        
        // Активные чек-листы
        const checklists = JSON.parse(localStorage.getItem('hydroHelperChecklists') || '[]');
        const activeChecklists = checklists.filter(c => !c.completed).length;
        document.getElementById('active-checklists').textContent = activeChecklists;
        
        // Расчет среднего роста
        let avgGrowth = 0;
        if (this.currentUser.plants && this.currentUser.plants.length > 0) {
            const totalDays = this.currentUser.plants.reduce((sum, plant) => {
                const plantingDate = new Date(plant.date);
                const today = new Date();
                const days = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24));
                return sum + (days > 0 ? days : 0);
            }, 0);
            avgGrowth = Math.floor(totalDays / this.currentUser.plants.length);
        }
        document.getElementById('avg-growth').textContent = `${avgGrowth} дней`;
        
        // Обновление достижений
        this.updateAchievements();
    },
    
    // Обновление достижений
    updateAchievements: function() {
        if (!this.currentUser) return;
        
        const achievements = this.currentUser.achievements || {};
        const stats = this.currentUser.stats || {};
        
        // Обновляем статус достижений
        if (this.currentUser.plants && this.currentUser.plants.length > 0) {
            achievements.firstPlant = true;
        }
        
        if (this.currentUser.plants && this.currentUser.plants.length >= 5) {
            achievements.fivePlants = true;
        }
        
        // Месяц с нами
        const joinDate = new Date(this.currentUser.joinDate);
        const today = new Date();
        const daysActive = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
        if (daysActive >= 30) {
            achievements.oneMonth = true;
        }
        
        // 10 расчетов
        if (stats.calculatorUses >= 10) {
            achievements.tenCalculations = true;
        }
        
        // Первая диагностика
        if (stats.diagnosticUses > 0) {
            achievements.firstDiagnostic = true;
        }
        
        // Обновляем уровень
        let level = 'Новичок';
        const plantCount = this.currentUser.plants ? this.currentUser.plants.length : 0;
        
        if (plantCount >= 10) level = 'Эксперт';
        else if (plantCount >= 5) level = 'Опытный';
        else if (plantCount >= 1) level = 'Начинающий';
        
        this.currentUser.stats.level = level;
        
        // Сохраняем обновленные достижения
        this.currentUser.achievements = achievements;
        
        // Обновляем отображение
        const achievementElements = document.querySelectorAll('.achievement');
        achievementElements.forEach(el => {
            const type = el.querySelector('span').textContent;
            let achieved = false;
            
            if (type === 'Первое растение') achieved = achievements.firstPlant;
            else if (type === '5 растений') achieved = achievements.fivePlants;
            else if (type === 'Месяц с нами') achieved = achievements.oneMonth;
            else if (type === '10 расчетов') achieved = achievements.tenCalculations;
            else if (type === 'Диагностика') achieved = achievements.firstDiagnostic;
            
            el.setAttribute('data-achieved', achieved);
        });
        
        // Сохраняем изменения
        this.saveData();
    },
    
    // Редактирование профиля
    editProfile: function() {
        const newName = prompt('Введите новое имя:', this.currentUser.name);
        if (newName && newName.trim()) {
            this.currentUser.name = newName.trim();
            this.saveData();
            this.updateAuthUI();
            this.showNotification('Имя обновлено', 'success');
            this.updateProfileData();
        }
    },
    
    // Экспорт данных пользователя
    exportUserData: function() {
        if (!this.currentUser) return;
        
        const data = {
            user: this.currentUser,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hydrohelper-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Данные успешно экспортированы', 'success');
    },
    
    // Обновление UI аутентификации
    updateAuthUI: function() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userMenu = document.getElementById('user-menu');
        const usernameDisplay = document.getElementById('username-display');
        const authRequired = document.getElementById('auth-required');
        const plantsSection = document.getElementById('plants-section');
        
        if (this.currentUser) {
            // Пользователь авторизован
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userMenu) userMenu.classList.remove('hidden');
            if (usernameDisplay) usernameDisplay.textContent = this.currentUser.name;
            
            if (authRequired) authRequired.classList.add('hidden');
            if (plantsSection) plantsSection.classList.remove('hidden');
        } else {
            // Пользователь не авторизован
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (registerBtn) registerBtn.style.display = 'inline-block';
            if (userMenu) userMenu.classList.add('hidden');
            
            if (authRequired) authRequired.classList.remove('hidden');
            if (plantsSection) plantsSection.classList.add('hidden');
        }
        
        // Обновляем отображение растений
        this.updatePlantsDisplay();
    },
    
    // Миграция растений в аккаунт
    migratePlantsToAccount: function() {
        if (!this.currentUser) return;
        
        const localPlants = JSON.parse(localStorage.getItem('hydroHelperLocalPlants') || '[]');
        
        if (localPlants.length > 0) {
            if (!this.currentUser.plants) {
                this.currentUser.plants = [];
            }
            
            // Добавляем растения в аккаунт
            this.currentUser.plants = [...this.currentUser.plants, ...localPlants];
            this.currentUser.stats.totalPlants = this.currentUser.plants.length;
            
            // Очищаем локальное хранилище
            localStorage.removeItem('hydroHelperLocalPlants');
            
            // Сохраняем изменения
            this.saveData();
            
            this.showNotification(`Перенесено ${localPlants.length} растений в аккаунт`, 'success');
            this.updatePlantsDisplay();
            this.updateAchievements();
        }
    },
    
    // Настройка конструктора
    setupWizard: function() {
        const options = document.querySelectorAll('.wizard .option');
        const nextButtons = document.querySelectorAll('.btn-next');
        const prevButtons = document.querySelectorAll('.btn-prev');
        const submitButton = document.querySelector('.btn-submit');
        const startJournalBtn = document.getElementById('start-journal');
        const savePlanBtn = document.getElementById('save-plan');
        
        // Выбор опций
        options.forEach(option => {
            option.addEventListener('click', function() {
                const step = this.closest('.wizard-content').id;
                const value = this.getAttribute('data-value');
                
                // Удаляем выделение у других опций в этом шаге
                const parent = this.parentElement;
                parent.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Выделяем выбранную опцию
                this.classList.add('selected');
                
                // Сохраняем выбор
                if (step === 'step-1') {
                    HydroHelper.userSelections.plant = value;
                } else if (step === 'step-2') {
                    HydroHelper.userSelections.location = value;
                } else if (step === 'step-3') {
                    HydroHelper.userSelections.budget = value;
                }
            });
        });
        
        // Кнопки "Далее"
        nextButtons.forEach(button => {
            button.addEventListener('click', function() {
                const currentStep = this.closest('.wizard-content');
                const currentStepId = currentStep.id;
                const nextStepNum = parseInt(currentStepId.split('-')[1]) + 1;
                const nextStep = document.getElementById(`step-${nextStepNum}`);
                
                // Проверяем, выбрана ли опция
                const hasSelection = currentStep.querySelector('.option.selected');
                if (!hasSelection) {
                    HydroHelper.showNotification('Пожалуйста, выберите вариант ответа', 'error');
                    return;
                }
                
                // Обновляем индикатор шагов
                document.querySelectorAll('.step').forEach(step => {
                    step.classList.remove('active');
                    if (parseInt(step.getAttribute('data-step')) === nextStepNum) {
                        step.classList.add('active');
                    }
                });
                
                // Переключаем шаги
                document.querySelectorAll('.wizard-content').forEach(content => {
                    content.classList.remove('active');
                });
                nextStep.classList.add('active');
                
                // Прокручиваем к следующему шагу
                nextStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
        
        // Кнопка "Назад"
        prevButtons.forEach(button => {
            button.addEventListener('click', function() {
                const currentStep = this.closest('.wizard-content');
                const currentStepId = currentStep.id;
                const prevStepNum = parseInt(currentStepId.split('-')[1]) - 1;
                const prevStep = document.getElementById(`step-${prevStepNum}`);
                
                // Обновляем индикатор шагов
                document.querySelectorAll('.step').forEach(step => {
                    step.classList.remove('active');
                    if (parseInt(step.getAttribute('data-step')) === prevStepNum) {
                        step.classList.add('active');
                    }
                });
                
                // Переключаем шаги
                document.querySelectorAll('.wizard-content').forEach(content => {
                    content.classList.remove('active');
                });
                prevStep.classList.add('active');
            });
        });
        
        // Кнопка "Получить план"
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                if (!this.userSelections.plant || !this.userSelections.location || !this.userSelections.budget) {
                    this.showNotification('Пожалуйста, ответьте на все вопросы', 'error');
                    return;
                }
                
                this.generateRecommendation();
                
                // Показываем рекомендацию
                const recommendation = document.getElementById('recommendation');
                recommendation.classList.remove('hidden');
                recommendation.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        
        // Кнопка "Добавить в мой сад"
        if (startJournalBtn) {
            startJournalBtn.addEventListener('click', () => {
                this.addPlantFromWizard();
            });
        }
        
        // Кнопка "Сохранить план"
        if (savePlanBtn) {
            savePlanBtn.addEventListener('click', () => {
                this.savePlan();
            });
        }
    },
    
    // Генерация рекомендации
    generateRecommendation: function() {
        const planDetails = document.getElementById('plan-details');
        const materialsList = document.getElementById('materials-list');
        
        // Данные для рекомендаций
        const plantData = {
            lettuce: {
                name: 'Салат и зелень',
                system: 'Система глубоководных культур (DWC)',
                difficulty: 'Низкая',
                harvest: 'после появления всходов от 3 до 4 недель',
                tips: 'Идеально для начинающих. Растет быстро, требует мало внимания.'
            },
            herbs: {
                name: 'Пряные травы',
                system: 'Капельная система',
                difficulty: 'Средняя',
                harvest: 'после появления всходов от 7 до 10 недель',
                tips: 'Не требует насоса. Просто добавьте воду с питательным раствором.'
            },
            tomato: {
                name: 'Томаты и перцы',
                system: 'Система периодического затопления',
                difficulty: 'Сложная',
                harvest: 'с момента цветения от 8 до 12 недель',
                tips++: 'Нужно больше света и пространства. Требует подвязки.'
            },
            strawberry: {
                name: 'Клубника',
                system: 'Система питательного слоя (NFT)',
                difficulty: 'Сложная',
                harvest: 'с момента цветения от 10 до 14 недель',
                tips: 'Любит прохладу. Нужно опыление (можно вручную кисточкой).'
            },
             strawberries: {
                name: 'Земляника',
                system: 'Система питательного слоя (NFT)',
                difficulty: 'Средняя',
                harvest: 'с момента цветения от 8 до 12 недель',
                tips: 'Любит прохладу. Нужно опыление (можно вручную кисточкой).'
            }
        };
        
        const locationData = {
            windowsill: 'на подоконнике',
            balcony: 'на балконе',
            garage: 'в гараже или подвале',
            room: 'в комнате'
        };
        
        const budgetData = {
            minimal: 'Минимальный (до 5000₽)',
            medium: 'Средний (5000-15000₽)',
            unlimited: 'Неограниченный (от 15000₽)'
        };
        
        const plant = plantData[this.userSelections.plant] || plantData.lettuce;
        const location = locationData[this.userSelections.location] || locationData.windowsill;
        const budget = budgetData[this.userSelections.budget] || budgetData.minimal;
        
        // Формируем план
        let planHTML = `
            <div class="plan-summary">
                <h4>Ваш выбор:</h4>
                <p><strong>Растение:</strong> ${plant.name}</p>
                <p><strong>Местоположение:</strong> ${location}</p>
                <p><strong>Бюджет:</strong> ${budget}</p>
                <div class="plan-tips">
                    <i class="fas fa-lightbulb"></i>
                    <div>
                        <strong>Совет:</strong> ${plant.tips}<br>
                        <strong>Сложность:</strong> ${plant.difficulty}<br>
                        <strong>Первый урожай:</strong> ${plant.harvest}
                    </div>
                </div>
                <h4>Рекомендуемая система:</h4>
                <p>${plant.system}</p>
            </div>
        `;
        
        planDetails.innerHTML = planHTML;
        
        // Формируем список материалов
        let materials = [];
        
        // Базовые материалы для всех
        materials.push('Емкость для раствора (10-20 л)');
        materials.push('Субстрат (кокосовое волокно или керамзит)');
        materials.push('Двухкомпонентные удобрения для гидропоники (А+В)');
        materials.push('Ремонтантные сорта семян для выращивания в условиях гидропоники');
        materials.push('pH-тест воды (жидкость или полоски)');
        
        // Дополнительные материалы в зависимости от бюджета
        if (this.userSelections.budget === 'minimal') {
            materials.push('Пластиковые стаканчики с отверстиями');
            materials.push('Диски для проращивания семян (кокосовые)');
            materials.push('Воздушный компрессор для аквариума (для DWC)');
        } else if (this.userSelections.budget === 'medium') {
            materials.push('Горшки для гидропоники (сетчатые)');
            materials.push('Насос и таймер (для периодического затопления)');
            materials.push('Фитолампа (если мало естественного света)');
        } else {
            materials.push('Готовый набор для гидропоники');
            materials.push('Цифровой pH-метр');
            materials.push('EC-метр (измеритель концентрации)');
            materials.push('Профессиональная фитолампа полного спектра');
            materials.push('Автоматический дозатор питательного раствора');
        }
        
        // Генерируем список
        materialsList.innerHTML = '';
        materials.forEach(material => {
            const li = document.createElement('li');
            li.textContent = material;
            materialsList.appendChild(li);
        });
    },
    
    // Сохранение плана
    savePlan: function() {
        if (!this.currentUser) {
            this.showNotification('Войдите в аккаунт, чтобы сохранять планы', 'error');
            return;
        }
        
        const planData = {
            id: Date.now(),
            plant: this.userSelections.plant,
            location: this.userSelections.location,
            budget: this.userSelections.budget,
            created: new Date().toISOString()
        };
        
        if (!this.currentUser.savedPlans) {
            this.currentUser.savedPlans = [];
        }
        
        this.currentUser.savedPlans.push(planData);
        this.saveData();
        
        this.showNotification('План успешно сохранен!', 'success');
        this.stats.plansSaved++;
        this.saveStats();
    },
    
    // Добавление растения из конструктора
    addPlantFromWizard: function() {
        const plantNames = {
            lettuce: 'Салат',
            herbs: 'Пряные травы',
            tomato: 'Томаты, перец',
            strawberry: 'Клубника',
            strawberries: 'Земланика'
        };
        
        const plantName = plantNames[this.userSelections.plant] || 'Мое растение';
        const plantDate = new Date().toISOString().split('T')[0];
        const plantType = this.userSelections.plant || 'other';
        
        this.addPlantToGarden(plantName, plantDate, plantType);
        
        // Прокручиваем к разделу "Мой сад"
        document.getElementById('journal').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    // Добавление растения в сад
    addPlantToGarden: function(name, date, type = 'other') {
        const plant = {
            id: Date.now(),
            name: name,
            type: type,
            date: date,
            days: 0,
            photos: [],
            added: new Date().toISOString(),
            lastPhoto: null
        };
        
        // Если пользователь не авторизован, сохраняем локально
        if (!this.currentUser) {
            const localPlants = JSON.parse(localStorage.getItem('hydroHelperLocalPlants') || '[]');
            localPlants.push(plant);
            localStorage.setItem('hydroHelperLocalPlants', JSON.stringify(localPlants));
            
            this.showNotification('Растение сохранено локально. Войдите в аккаунт для синхронизации.', 'info');
        } else {
            // Если пользователь авторизован, сохраняем в аккаунт
            if (!this.currentUser.plants) {
                this.currentUser.plants = [];
            }
            
            this.currentUser.plants.push(plant);
            this.currentUser.stats.totalPlants = this.currentUser.plants.length;
            
            // Сохраняем изменения
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = this.currentUser;
                this.saveData();
            }
            
            // Обновляем достижения
            this.updateAchievements();
            
            this.showNotification(`${name} добавлено в ваш сад!`, 'success');
        }
        
        // Обновляем отображение
        this.updatePlantsDisplay();
    },
    
    // Обновление отображения растений
    updatePlantsDisplay: function() {
        const plantsContainer = document.getElementById('plants-container');
        const noPlants = document.getElementById('no-plants');
        
        let plants = [];
        
        // Получаем растения в зависимости от авторизации
        if (this.currentUser) {
            plants = this.currentUser.plants || [];
        } else {
            plants = JSON.parse(localStorage.getItem('hydroHelperLocalPlants') || '[]');
        }
        
        if (plants.length === 0) {
            if (plantsContainer) plantsContainer.classList.add('hidden');
            if (noPlants) noPlants.classList.remove('hidden');
            return;
        }
        
        if (noPlants) noPlants.classList.add('hidden');
        if (plantsContainer) {
            plantsContainer.classList.remove('hidden');
            plantsContainer.innerHTML = '';
        }
        
        plants.forEach(plant => {
            // Рассчитываем дни с посадки
            const plantingDate = new Date(plant.date);
            const today = new Date();
            const days = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24));
            plant.days = days > 0 ? days : 0;
            
            // Рассчитываем прогресс (максимум 90 дней)
            const maxDays = 90;
            const progress = Math.min((days / maxDays) * 100, 100);
            
            // Определяем иконку в зависимости от типа растения
            let plantIcon = 'fas fa-leaf';
            if (plant.type === 'herbs') plantIcon = 'fas fa-spa';
            else if (plant.type === 'tomato') plantIcon = 'fas fa-apple-alt';
            else if (plant.type === 'strawberry') plantIcon = 'fas fa-star';
            
            const plantCard = document.createElement('div');
            plantCard.className = 'plant-card';
            plantCard.innerHTML = `
                <div class="plant-card-header">
                    <div class="plant-name">
                        <i class="${plantIcon}"></i>
                        ${plant.name}
                    </div>
                    <div class="plant-date">Посажено: ${plant.date}</div>
                </div>
                <div class="plant-progress">
                    <div class="progress-label">
                        <span>День ${plant.days}</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="plant-actions">
                    <button class="action-btn photo" data-id="${plant.id}">
                        <i class="fas fa-camera"></i> Добавить фото
                    </button>
                    <button class="action-btn delete" data-id="${plant.id}">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            `;
            
            if (plantsContainer) {
                plantsContainer.appendChild(plantCard);
            }
        });
        
        // Добавляем обработчики для кнопок
        document.querySelectorAll('.action-btn.photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.addPhotoToPlant(plantId);
            });
        });
        
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantId = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Удалить это растение из сада?')) {
                    this.removePlantFromGarden(plantId);
                }
            });
        });
    },
    
    // Добавление фото к растению
    addPhotoToPlant: function(plantId) {
        // В приложении здесь была бы загрузка фото

        
        const photoDate = new Date().toISOString().split('T')[0];
        
        if (!this.currentUser) {
            // Для неавторизованных пользователей
            const localPlants = JSON.parse(localStorage.getItem('hydroHelperLocalPlants') || '[]');
            const plant = localPlants.find(p => p.id === plantId);
            if (plant) {
                if (!plant.photos) plant.photos = [];
                plant.photos.push(photoDate);
                plant.lastPhoto = photoDate;
                localStorage.setItem('hydroHelperLocalPlants', JSON.stringify(localPlants));
                this.showNotification('Фото добавлено в историю растения!', 'success');
            }
        } else {
            // Для авторизованных пользователей
            const plant = this.currentUser.plants.find(p => p.id === plantId);
            if (plant) {
                if (!plant.photos) plant.photos = [];
                plant.photos.push(photoDate);
                plant.lastPhoto = photoDate;
                
                // Сохраняем изменения
                const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
                if (userIndex !== -1) {
                    this.users[userIndex] = this.currentUser;
                    this.saveData();
                }
                
                this.showNotification('Фото добавлено в историю растения!', 'success');
            }
        }
        
        // Обновляем отображение профиля
        if (this.currentUser) {
            this.updateProfileData();
        }
    },
    
    // Удаление растения
    removePlantFromGarden: function(plantId) {
        if (!this.currentUser) {
            // Для неавторизованных пользователей
            let localPlants = JSON.parse(localStorage.getItem('hydroHelperLocalPlants') || '[]');
            localPlants = localPlants.filter(p => p.id !== plantId);
            localStorage.setItem('hydroHelperLocalPlants', JSON.stringify(localPlants));
        } else {
            // Для авторизованных пользователей
            this.currentUser.plants = this.currentUser.plants.filter(p => p.id !== plantId);
            this.currentUser.stats.totalPlants = this.currentUser.plants.length;
            
            // Сохраняем изменения
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = this.currentUser;
                this.saveData();
            }
            
            // Обновляем достижения
            this.updateAchievements();
        }
        
        this.updatePlantsDisplay();
        this.showNotification('Растение удалено', 'info');
    },
    
    // Настройка диагностики
    setupDiagnostic: function() {
        const diagnosticModal = document.getElementById('diagnostic-modal');
        const startDiagnosticBtn = document.getElementById('start-diagnostic');
        const diagnosticOpenBtns = document.querySelectorAll('.diagnostic-open');
        const diagnosticClose = document.querySelector('.diagnostic-close');
        const optionBtns = document.querySelectorAll('.diagnostic-step .option-btn');
        const prevDiagnosticBtns = document.querySelectorAll('.btn-prev-diagnostic');
        const restartBtn = document.getElementById('restart-diagnostic');
        const saveDiagnosticBtn = document.getElementById('save-diagnostic');
        
        let currentStep = 1;
        let diagnosticData = {
            problem: null,
            location: null,
            duration: null
        };
        
        // Открытие диагностики
        const openDiagnostic = () => {
            diagnosticModal.classList.remove('hidden');
            currentStep = 1;
            diagnosticData = { problem: null, location: null, duration: null };
            this.resetDiagnostic();
        };
        
        if (startDiagnosticBtn) {
            startDiagnosticBtn.addEventListener('click', openDiagnostic);
        }
        
        diagnosticOpenBtns.forEach(btn => {
            btn.addEventListener('click', openDiagnostic);
        });
        
        // Закрытие диагностики
        if (diagnosticClose) {
            diagnosticClose.addEventListener('click', () => {
                diagnosticModal.classList.add('hidden');
            });
        }
        
        diagnosticModal.addEventListener('click', (e) => {
            if (e.target === diagnosticModal) {
                diagnosticModal.classList.add('hidden');
            }
        });
        
        // Обработка выбора в диагностике
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const nextStep = btn.getAttribute('data-next');
                const solution = btn.getAttribute('data-solution');
                const problem = btn.getAttribute('data-problem');
                
                if (problem) {
                    diagnosticData.problem = problem;
                }
                
                if (nextStep) {
                    // Переход к следующему шагу
                    document.querySelector('.diagnostic-step.active').classList.remove('active');
                    document.getElementById(nextStep).classList.add('active');
                    currentStep = parseInt(nextStep.split('-')[1]);
                    
                    // Обновляем прогресс
                    this.updateDiagnosticProgress(currentStep);
                    
                    if (nextStep === 'step-2-d') {
                        diagnosticData.location = null;
                    } else if (nextStep === 'step-3-d') {
                        diagnosticData.duration = null;
                    }
                } else if (solution) {
                    // Завершение диагностики
                    if (currentStep === 2) {
                        diagnosticData.location = solution;
                        document.querySelector('.diagnostic-step.active').classList.remove('active');
                        document.getElementById('step-3-d').classList.add('active');
                        currentStep = 3;
                        this.updateDiagnosticProgress(currentStep);
                    } else if (currentStep === 3) {
                        diagnosticData.duration = solution;
                        this.showDiagnosticResult(diagnosticData);
                    }
                }
            });
        });
        
        // Кнопка "Назад"
        prevDiagnosticBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) {
                    document.querySelector('.diagnostic-step.active').classList.remove('active');
                    const prevStep = `step-${currentStep - 1}-d`;
                    document.getElementById(prevStep).classList.add('active');
                    currentStep--;
                    this.updateDiagnosticProgress(currentStep);
                }
            });
        });
        
        // Кнопка "Начать заново"
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.resetDiagnostic();
            });
        }
        
        // Сохранение результата диагностики
        if (saveDiagnosticBtn) {
            saveDiagnosticBtn.addEventListener('click', () => {
                this.saveDiagnosticResult(diagnosticData);
            });
        }
    },
    
    // Обновление прогресса диагностики
    updateDiagnosticProgress: function(step) {
        document.querySelectorAll('.progress-step').forEach((el, index) => {
            if (index < step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    },
    
    // Сброс диагностики
    resetDiagnostic: function() {
        document.querySelectorAll('.diagnostic-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById('step-1-d').classList.add('active');
        document.getElementById('solution-display').classList.add('hidden');
        currentStep = 1;
        this.updateDiagnosticProgress(1);
    },
    
    // Показ результата диагностики
    showDiagnosticResult: function(data) {
        document.querySelector('.diagnostic-step.active').classList.remove('active');
        document.getElementById('solution-display').classList.remove('hidden');
        
        let solutionText = '';
        
        // Определяем решение на основе данных
        if (data.problem === 'yellow') {
            if (data.location === 'nitrogen') {
                solutionText = 'Вероятно, не хватает азота. Добавьте в раствор удобрение с повышенным содержанием азота. Проверьте pH - он должен быть в диапазоне 5.5-6.5 для лучшего усвоения питательных веществ.';
            } else if (data.location === 'light') {
                solutionText = 'Растению не хватает света или есть избыток. Увеличьте продолжительность светового дня до 12-14 часов или переставьте растение в более светлое место. Избегайте прямых солнечных лучей в полдень.';
            } else {
                solutionText = 'Возможен избыток удобрений или неправильный pH. Промойте корневую систему чистой водой, затем добавьте свежий раствор с правильной концентрацией.';
            }
        } else if (data.problem === 'wilted') {
            solutionText = 'Растению не хватает воды или кислорода. Проверьте уровень воды в системе, убедитесь, что насос работает правильно. Увеличьте аэрацию раствора.';
        } else if (data.problem === 'spots') {
            solutionText = 'Возможно грибковое заболевание. Уменьшите влажность, обеспечьте хорошую вентиляцию. Удалите пораженные листья. Можно использовать биопрепараты на основе сенной палочки.';
        } else if (data.problem === 'nogrowth') {
            solutionText = 'Проверьте основные параметры: температуру (оптимально 18-24°C), pH (5.5-6.5), концентрацию раствора. Убедитесь, что растению достаточно света (12-14 часов в день).';
        }
        
        // Добавляем рекомендацию по времени
        if (data.duration === 'recent') {
            solutionText += '\n\nПроблема появилась недавно - скорее всего, вы сможете быстро решить ее, следуя рекомендациям выше.';
        } else if (data.duration === 'medium') {
            solutionText += '\n\nПроблема длится несколько дней - возможно, потребуется больше времени для восстановления растения. Будьте терпеливы.';
        } else if (data.duration === 'long') {
            solutionText += '\n\nПроблема длится долго - рассмотрите возможность замены растения, если оно не восстанавливается в течение недели после принятия мер.';
        }
        
        document.getElementById('solution-text').textContent = solutionText;
        
        // Увеличиваем счетчик диагностик
        this.stats.diagnosticCount++;
        this.saveStats();
    },
    
    // Сохранение результата диагностики
    saveDiagnosticResult: function(data) {
        if (!this.currentUser) {
            this.showNotification('Войдите в аккаунт, чтобы сохранять результаты диагностики', 'error');
            return;
        }
        
        if (!this.currentUser.diagnosticHistory) {
            this.currentUser.diagnosticHistory = [];
        }
        
        const diagnosticResult = {
            id: Date.now(),
            data: data,
            date: new Date().toISOString(),
            solution: document.getElementById('solution-text').textContent
        };
        
        this.currentUser.diagnosticHistory.push(diagnosticResult);
        this.currentUser.stats.diagnosticUses = this.currentUser.diagnosticHistory.length;
        
        // Сохраняем изменения
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveData();
        }
        
        // Обновляем достижения
        this.updateAchievements();
        
        this.showNotification('Результат диагностики сохранен!', 'success');
        document.getElementById('diagnostic-modal').classList.add('hidden');
    },
    
    // Настройка калькулятора питательного раствора
    setupCalculator: function() {
        const waterVolume = document.getElementById('water-volume');
        const volumeDisplay = document.getElementById('volume-display');
        const calculateBtn = document.getElementById('calculate-btn');
        const plantType = document.getElementById('plant-type');
        
        // Обновление отображения объема
        waterVolume.addEventListener('input', () => {
            volumeDisplay.textContent = `${waterVolume.value} л`;
        });
        
        // Расчет рецепта
        calculateBtn.addEventListener('click', () => {
            const volume = parseInt(waterVolume.value);
            const plant = plantType.value;
            
            // Базовые рецепты (в мл на 10 л воды)
            const recipes = {
                lettuce: { A: 10, B: 10, pHDown: 1, description: 'Для салата и зелени используйте слабую концентрацию' },
                herbs: { A: 8, B: 8, pHDown: 1, description: 'Травы чувствительны к концентрации, лучше меньше' },
                tomato: { A: 15, B: 15, pHDown: 2, description: 'Томатам и перцам нужна усиленная подкормка' },
                strawberry: { A: 12, B: 12, pHDown: 1.5, description: 'Клубника и земляника любит среднюю концентрацию' }
            };
            
            const recipe = recipes[plant] || recipes.lettuce;
            
            // Пересчет на выбранный объем
            const multiplier = volume / 10;
            const amountA = Math.round(recipe.A * multiplier);
            const amountB = Math.round(recipe.B * multiplier);
            const amountPHDown = Math.round(recipe.pHDown * multiplier * 10) / 10;
            
            // Формирование результата
            const result = document.getElementById('calculation-result');
            const recipeResult = document.getElementById('recipe-result');
            
            recipeResult.innerHTML = `
                <strong>${recipe.description}</strong><br><br>
                Для <strong>${volume} литров</strong> воды:<br>
                • <strong>Удобрение А:</strong> ${amountA} мл<br>
                • <strong>Удобрение Б:</strong> ${amountB} мл<br>
                • <strong>pH Down:</strong> ${amountPHDown} мл<br><br>
                <em>Смешайте удобрения по отдельности с небольшим количеством воды перед добавлением в общую емкость.</em>
            `;
            
            result.classList.remove('hidden');
            result.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Увеличиваем счетчик использований калькулятора
            this.stats.calculatorCount++;
            this.saveStats();
            
            // Обновляем статистику пользователя
            if (this.currentUser) {
                this.currentUser.stats.calculatorUses = (this.currentUser.stats.calculatorUses || 0) + 1;
                this.saveData();
                this.updateAchievements();
            }
        });
    },
    
    // Настройка калькулятора освещенности
    setupLightCalculator: function() {
        const calculateLightBtn = document.getElementById('calculate-light');
        
        if (calculateLightBtn) {
            calculateLightBtn.addEventListener('click', () => {
                const windowDirection = document.getElementById('window-direction').value;
                const plantLight = document.getElementById('plant-light').value;
                
                let recommendation = '';
                
                // Определяем рекомендации
                if (plantLight === 'low') {
                    if (windowDirection === 'south' || windowDirection === 'southeast') {
                        recommendation = 'Отличные условия! Ваши теневыносливые растения получат достаточно света. Притеняйте от прямого полуденного солнца.';
                    } else if (windowDirection === 'east' || windowDirection === 'west') {
                        recommendation = 'Хорошие условия. Растения получат достаточно рассеянного света. Дополнительное освещение не требуется.';
                    } else {
                        recommendation = 'Мало естественного света. Добавьте фитолампу на 4-6 часов в день. Разместите растения как можно ближе к окну.';
                    }
                } else if (plantLight === 'medium') {
                    if (windowDirection === 'south') {
                        recommendation = 'Идеальные условия! Растения получат достаточно света. В летний период может потребоваться легкое притенение.';
                    } else if (windowDirection === 'southeast' || windowDirection === 'east') {
                        recommendation = 'Хорошие условия. Для оптимального роста добавьте фитолампу на 2-4 часа в день.';
                    } else {
                        recommendation = 'Недостаточно света. Обязательно добавьте фитолампу на 6-8 часов в день. Выбирайте лампы полного спектра.';
                    }
                } else if (plantLight === 'high') {
                    if (windowDirection === 'south') {
                        recommendation = 'Отличные условия для светолюбивых растений! Обеспечьте максимальное освещение.';
                    } else {
                        recommendation = 'Требуется интенсивное дополнительное освещение. Используйте мощные фитолампы на 10-12 часов в день. Разместите растения на южном окне, если возможно.';
                    }
                }
                
                // Добавляем общие рекомендации
                recommendation += '\n\nОбщие рекомендации:\n• Световой день: ни менее 12-14 часов\n• Расстояние до лампы: 20-40 см\n• Используйте таймер для автоматизации\n• Регулярно поворачивайте растения';
                
                const lightResult = document.getElementById('light-result');
                const lightRecommendation = document.getElementById('light-recommendation');
                
                lightRecommendation.textContent = recommendation;
                lightResult.classList.remove('hidden');
                lightResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    },
    
    // Настройка чек-листа
    setupChecklist: function() {
        const resetButton = document.getElementById('reset-checklist');
        const saveButton = document.getElementById('save-checklist');
        const checkboxes = document.querySelectorAll('.checkbox input');
        
        // Загрузка состояния чек-листа
        this.loadChecklistState();
        
        // Обработка изменений чекбоксов
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                this.saveChecklistState();
                this.updateChecklistProgress();
            });
        });
        
        // Сброс чек-листа
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                this.saveChecklistState();
                this.updateChecklistProgress();
                this.showNotification('Чек-лист сброшен! Не забудьте выполнить все пункты на этой неделе.', 'info');
            });
        }
        
        // Сохранение чек-листа
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveChecklistToHistory();
            });
        }
    },
    
    // Загрузка состояния чек-листа
    loadChecklistState: function() {
        const checkboxes = document.querySelectorAll('.checkbox input');
        const savedState = JSON.parse(localStorage.getItem('hydroHelperChecklist') || '{}');
        
        checkboxes.forEach((checkbox, index) => {
            const task = checkbox.getAttribute('data-task');
            if (savedState[task]) {
                checkbox.checked = savedState[task];
            }
        });
        
        this.updateChecklistProgress();
    },
    
    // Сохранение состояния чек-листа
    saveChecklistState: function() {
        const checkboxes = document.querySelectorAll('.checkbox input');
        const state = {};
        
        checkboxes.forEach(checkbox => {
            const task = checkbox.getAttribute('data-task');
            state[task] = checkbox.checked;
        });
        
        localStorage.setItem('hydroHelperChecklist', JSON.stringify(state));
    },
    
    // Обновление прогресса чек-листа
    updateChecklistProgress: function() {
        const checkboxes = document.querySelectorAll('.checkbox input');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const totalCount = checkboxes.length;
        const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        
        const progressContainer = document.getElementById('checklist-progress');
        const progressBar = document.getElementById('checklist-progress-bar');
        const percentDisplay = document.getElementById('checklist-percent');
        
        if (checkedCount > 0) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = `${percent}%`;
            percentDisplay.textContent = `${percent}%`;
        } else {
            progressContainer.classList.add('hidden');
        }
    },
    
    // Сохранение чек-листа в историю
    saveChecklistToHistory: function() {
        const checkboxes = document.querySelectorAll('.checkbox input');
        const checkedTasks = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.getAttribute('data-task'));
        
        if (checkedTasks.length === 0) {
            this.showNotification('Отметьте выполненные задачи', 'error');
            return;
        }
        
        const checklistHistory = JSON.parse(localStorage.getItem('hydroHelperChecklistHistory') || '[]');
        
        const checklistRecord = {
            id: Date.now(),
            date: new Date().toISOString(),
            completedTasks: checkedTasks,
            totalTasks: checkboxes.length
        };
        
        checklistHistory.push(checklistRecord);
        localStorage.setItem('hydroHelperChecklistHistory', JSON.stringify(checklistHistory));
        
        // Сбрасываем чек-лист
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.saveChecklistState();
        this.updateChecklistProgress();
        
        this.showNotification(`Сохранено ${checkedTasks.length} выполненных задач!`, 'success');
    },
    
    // Настройка базы знаний
    setupKnowledgeBase: function() {
        const knowledgeButtons = document.querySelectorAll('.card-btn[data-knowledge]');
        
        knowledgeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const knowledgeType = e.target.getAttribute('data-knowledge');
                this.showKnowledgeDetails(knowledgeType);
            });
        });
    },
    
    // Показать детали базы знаний
    showKnowledgeDetails: function(type) {
        const knowledgeData = {
            ph: {
                title: 'Что такое pH воды и как его измерить?',
                content: 'pH - это мера кислотности или щелочности раствора по шкале от 0 до 14. Для развития растений в условиях гидропоники оптимальный диапазон значений pH воды - 5,5-6,5.\n\nКак измерить:\n1. Капельные тесты - самый простой и дешевый способ\n2. pH-полоски - дают приблизительный результат\n3. Электронный pH-метр - самый точный, требует калибровки\n\nКак корректировать pH:\n• pH Down (фосфорная кислота) - для понижения\n• pH Up (гидроксид калия) - для повышения\n\nИзмеряйте pH водного раствора регулярно, ни реже одного раза в неделю!'
            },
            light: {
                title: 'Сколько нужно света растениям?',
                content: 'Освещение - ключевой фактор успеха в гидропонике.\n\nРекомендации по освещению:\n• Световой день: ни менее 12-16 часов\n• Темный период: 8-12 часов (растениям тоже нужен отдых)\n• Интенсивность: 100-300 Вт/м² для большинства растений\n\nТипы освещения:\n1. Люминесцентные лампы - для рассады и зелени\n2. LED фитолампы - экономичные, долговечные\n3. ДНаТ/ДРИ - мощные, для цветения и плодоношения\n\nПризнаки недостатка света:\n• Вытягивание стеблей\n• Мелкие листья\n• Бледная окраска\n• Медленный рост'
            },
            mistakes: {
                title: '5 самых частых ошибок новичков',
                content: '1. СЛИШКОМ МНОГО минеральных водорастворимых УДОБРЕНИЙ\n   • Признаки: ожоги листьев, замедление роста\n   • Решение: используйте 50-70% от рекомендуемой дозы\n\n2. МАЛО КИСЛОРОДА В ВОДЕ\n   • Признаки: гниение корней, плохой рост\n   • Решение: используйте аэратор, меняйте раствор раз в 1-2 недели\n\n3. НЕПРАВИЛЬНЫЙ pH\n   • Признаки: дефицит питательных веществ\n   • Решение: измеряйте и корректируйте pH регулярно\n\n4. СЛИШКОМ БЛИЗКО РАСТЕНИЯ\n   • Признаки: конкуренция за свет и питание\n   • Решение: соблюдайте расстояние 20-30 см между растениями\n\n5. НЕ МЕНЯТЬ РАСТВОР\n   • Признаки: накопление солей, дисбаланс питания\n   • Решение: меняйте раствор полностью каждые 2-3 недели'
            }
        };
        
        const data = knowledgeData[type];
        if (data) {
            alert(`${data.title}\n\n${data.content}`);
        }
    },
    
    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Меню навигации для мобильных
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
        
        // Закрытие меню при клике на ссылку
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
        
        // Добавление растения вручную
        const addPlantBtn = document.getElementById('add-plant-btn');
        const plantNameInput = document.getElementById('plant-name');
        const plantDateInput = document.getElementById('plant-date');
        const plantTypeSelect = document.getElementById('plant-type-select');
        
        // Устанавливаем сегодняшнюю дату по умолчанию
        if (plantDateInput) {
            const today = new Date().toISOString().split('T')[0];
            plantDateInput.value = today;
            plantDateInput.max = today;
        }
        
        if (addPlantBtn) {
            addPlantBtn.addEventListener('click', () => {
                const name = plantNameInput.value.trim();
                const date = plantDateInput.value;
                const type = plantTypeSelect.value;
                
                if (!name) {
                    this.showNotification('Пожалуйста, введите название растения', 'error');
                    return;
                }
                
                if (!date) {
                    this.showNotification('Пожалуйста, выберите дату посадки', 'error');
                    return;
                }
                
                this.addPlantToGarden(name, date, type);
                
                // Очищаем поля ввода
                plantNameInput.value = '';
                plantDateInput.value = new Date().toISOString().split('T')[0];
                plantTypeSelect.value = 'other';
            });
        }
        
        // Добавляем возможность нажать Enter в поле названия
        if (plantNameInput) {
            plantNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addPlantBtn.click();
                }
            });
        }
    },
    
    // Показать уведомление
    showNotification: function(message, type = 'info') {
        // Цвета для разных типов уведомлений
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            info: '#2196F3',
            warning: '#FF9800'
        };
        
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${colors[type] || colors.info};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            font-weight: 500;
        `;
        
        // Анимация
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Содержимое уведомления
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close" style="
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                margin-left: 10px;
                color: white;
                opacity: 0.8;
            ">&times;</button>
        `;
        
        // Кнопка закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        // Добавляем уведомление на страницу
        document.body.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
};

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    HydroHelper.init();

});


