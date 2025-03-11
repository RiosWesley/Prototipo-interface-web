/**
 * doors.js - Gerenciamento de portas para o sistema SecureLab RFID
 * Versão corrigida
 */

// Garantir que o DOM foi carregado antes de inicializar
document.addEventListener('DOMContentLoaded', initDoorManagement);

// Variáveis globais
let doors = [];
let currentDoorId = null;
const doorsRef = firebase.database().ref('doors');

/**
 * Inicializa a página de gerenciamento de portas
 */
function initDoorManagement() {
    console.log('Inicializando gerenciamento de portas...');
    
    // Configurar eventos dos botões
    setupEventListeners();
    
    // Carregar portas do Firebase
    loadDoors();
}

/**
 * Configura todos os event listeners da página
 */
function setupEventListeners() {
    // Botão Nova Porta
    const addDoorBtn = document.getElementById('addDoorBtn');
    if (addDoorBtn) {
        addDoorBtn.addEventListener('click', () => openDoorModal());
    } else {
        console.error('Botão de adicionar porta não encontrado!');
    }
    
    // Botão Salvar no modal
    const saveDoorBtn = document.getElementById('saveDoorBtn');
    if (saveDoorBtn) {
        saveDoorBtn.addEventListener('click', handleDoorFormSubmit);
    }
    
    // Campo de pesquisa
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderDoors();
        });
    }
    
    // Botões de controle de porta no modal
    const lockDoorBtn = document.getElementById('lockDoorBtn');
    const unlockDoorBtn = document.getElementById('unlockDoorBtn');
    
    if (lockDoorBtn) {
        lockDoorBtn.addEventListener('click', () => controlDoor('lock'));
    }
    
    if (unlockDoorBtn) {
        unlockDoorBtn.addEventListener('click', () => controlDoor('unlock'));
    }
    
    // Configurar botões de fechar modal
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Também configurar botões cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            document.getElementById('doorModal').style.display = 'none';
        });
    }
    
    const closeControlBtn = document.getElementById('closeControlBtn');
    if (closeControlBtn) {
        closeControlBtn.addEventListener('click', function() {
            document.getElementById('controlDoorModal').style.display = 'none';
        });
    }
}

/**
 * Carrega as portas do Firebase
 */
function loadDoors() {
    console.log('Carregando portas do Firebase...');
    
    doorsRef.on('value', (snapshot) => {
        doors = [];
        snapshot.forEach((childSnapshot) => {
            const door = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            doors.push(door);
        });
        
        console.log(`Portas carregadas: ${doors.length}`);
        
        // Atualizar tabela
        renderDoors();
    }, (error) => {
        console.error("Erro ao carregar portas:", error);
        showNotification('Erro ao carregar portas: ' + error.message, 'error');
    });
}

/**
 * Renderiza as portas na tabela
 */
function renderDoors() {
    console.log('Renderizando portas na tabela...');
    
    const tableBody = document.querySelector('#doorsTable tbody');
    if (!tableBody) {
        console.error('Corpo da tabela não encontrado!');
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Filtrar portas se houver texto de pesquisa
    let displayDoors = [...doors]; // Clonar o array de portas
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const searchText = searchInput.value.trim().toLowerCase();
        if (searchText) {
            displayDoors = doors.filter(door => 
                (door.name?.toLowerCase() || '').includes(searchText) || 
                (door.location?.toLowerCase() || '').includes(searchText)
            );
        }
    }
    
    // Verificar se há portas para exibir
    if (displayDoors.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'Nenhuma porta encontrada.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    // Adicionar as portas à tabela
    displayDoors.forEach(door => {
        // Criar linha da tabela
        const row = document.createElement('tr');
        
        // Nome da porta
        const nameCell = document.createElement('td');
        nameCell.textContent = door.name || 'Sem nome';
        row.appendChild(nameCell);
        
        // Localização
        const locationCell = document.createElement('td');
        locationCell.textContent = door.location || 'Local não definido';
        row.appendChild(locationCell);
        
        // Status com ícone
        const statusCell = document.createElement('td');
        
        // Criar ícone baseado no status
        const statusIcon = document.createElement('i');
        if (door.status === 'locked') {
            statusIcon.className = 'fas fa-lock';
            statusIcon.style.color = '#e74c3c';
            statusCell.innerHTML = '<span style="color: #e74c3c;"><i class="fas fa-lock"></i> Trancada</span>';
        } else {
            statusIcon.className = 'fas fa-lock-open';
            statusIcon.style.color = '#2ecc71';
            statusCell.innerHTML = '<span style="color: #2ecc71;"><i class="fas fa-lock-open"></i> Destrancada</span>';
        }
        
        row.appendChild(statusCell);
        
        // Última Atividade
        const lastActivityCell = document.createElement('td');
        if (door.last_status_change) {
            const date = new Date(door.last_status_change);
            lastActivityCell.textContent = formatDate(date);
        } else {
            lastActivityCell.textContent = 'Nunca';
        }
        row.appendChild(lastActivityCell);
        
        // Botões de Ação
        const actionsCell = document.createElement('td');
        actionsCell.style.whiteSpace = 'nowrap';
        
        // Botão de Editar
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary me-2';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Editar Porta';
        editBtn.style.marginRight = '5px';
        
        // Adicionar o event listener DIRETAMENTE ao botão de editar
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão editar clicado para porta:', door.id);
            openDoorModal(door);
        });
        
        actionsCell.appendChild(editBtn);
        
        // Botão de Controle
        const controlBtn = document.createElement('button');
        controlBtn.className = 'btn btn-sm btn-outline-primary';
        controlBtn.innerHTML = '<i class="fas fa-sliders-h"></i>';
        controlBtn.title = 'Controlar Porta';
        
        // Adicionar o event listener DIRETAMENTE ao botão de controle
        controlBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão controlar clicado para porta:', door.id);
            openControlModal(door);
        });
        
        actionsCell.appendChild(controlBtn);
        row.appendChild(actionsCell);
        
        // Adicionar a linha à tabela
        tableBody.appendChild(row);
    });
}

/**
 * Função aprimorada para abrir o modal de porta de forma segura
 */
function openDoorModal(door = null) {
    console.log('Abrindo modal de porta:', door ? door.id : 'nova porta');
    
    // Limpar formulário
    const doorForm = document.getElementById('doorForm');
    const doorName = document.getElementById('doorName');
    const doorLocation = document.getElementById('doorLocation');
    const doorStatus = document.getElementById('doorStatus');
    
    if (doorForm) doorForm.reset();
    
    // Atualizar título do modal
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = door ? 'Editar Porta' : 'Adicionar Nova Porta';
    }
    
    if (door) {
        // Modo edição: preencher dados da porta existente
        currentDoorId = door.id;
        
        if (doorName) doorName.value = door.name || '';
        if (doorLocation) doorLocation.value = door.location || '';
        if (doorStatus) doorStatus.value = door.status || 'locked';
    } else {
        // Modo adição: limpar ID atual
        currentDoorId = null;
        
        // Valores padrão
        if (doorStatus) doorStatus.value = 'locked';
    }
    
    // Abrir o modal de forma segura
    const modal = document.getElementById('doorModal');
    if (modal) {
        // Garantir que o modal seja exibido
        modal.style.display = 'flex';
        
        // Forçar visibilidade
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        modal.style.zIndex = '1000';
        
        // Adicionar classe 'show' se relevante para seu CSS
        modal.classList.add('show');
        
        // Debugar para verificar se o modal está sendo exibido
        console.log('Modal aberto:', modal.style.display);
    } else {
        console.error('Modal não encontrado! Elemento com ID "doorModal" não existe.');
        alert('Erro ao abrir modal. Consulte o console para detalhes.');
    }
}


/**
 * Manipula o envio do formulário de porta
 */
function handleDoorFormSubmit() {
    const doorName = document.getElementById('doorName');
    const doorLocation = document.getElementById('doorLocation');
    const doorStatus = document.getElementById('doorStatus');
    
    // Validar campos obrigatórios
    if (!doorName || !doorName.value.trim()) {
        showNotification('O nome da porta é obrigatório', 'error');
        return;
    }
    
    if (!doorLocation || !doorLocation.value.trim()) {
        showNotification('A localização da porta é obrigatória', 'error');
        return;
    }
    
    // Obter dados do formulário
    const doorData = {
        name: doorName.value.trim(),
        location: doorLocation.value.trim(),
        status: doorStatus ? doorStatus.value : 'locked',
        last_status_change: new Date().toISOString()
    };
    
    // Salvar no Firebase
    if (currentDoorId) {
        // Atualizar porta existente
        doorsRef.child(currentDoorId).update(doorData)
            .then(() => {
                closeModal('doorModal');
                showNotification('Porta atualizada com sucesso', 'success');
            })
            .catch(error => {
                console.error('Erro ao atualizar porta:', error);
                showNotification('Erro ao atualizar porta: ' + error.message, 'error');
            });
    } else {
        // Adicionar nova porta
        doorsRef.push(doorData)
            .then(() => {
                closeModal('doorModal');
                showNotification('Porta adicionada com sucesso', 'success');
            })
            .catch(error => {
                console.error('Erro ao adicionar porta:', error);
                showNotification('Erro ao adicionar porta: ' + error.message, 'error');
            });
    }
}

/**
 * Função aprimorada para abrir o modal de controle de forma segura
 */
function openControlModal(door) {
    if (!door) {
        console.error('Nenhuma porta fornecida para o modal de controle');
        return;
    }
    
    console.log('Abrindo modal de controle para porta:', door.id);
    
    // Armazenar o ID da porta atual
    currentDoorId = door.id;
    
    // Preencher informações no modal
    const controlModalTitle = document.getElementById('controlModalTitle');
    const controlDoorName = document.getElementById('controlDoorName');
    const controlDoorStatus = document.getElementById('controlDoorStatus');
    
    if (controlModalTitle) {
        controlModalTitle.textContent = `Controlar Porta - ${door.name || 'Sem nome'}`;
    }
    
    if (controlDoorName) {
        controlDoorName.textContent = door.name || 'Porta';
    }
    
    if (controlDoorStatus) {
        const statusSpan = controlDoorStatus.querySelector('span') || controlDoorStatus;
        statusSpan.textContent = door.status === 'locked' ? 'Trancada' : 'Destrancada';
        
        if (door.status === 'locked') {
            statusSpan.className = 'status-badge status-locked';
        } else {
            statusSpan.className = 'status-badge status-unlocked';
        }
    }
    
    // Ajustar visibilidade dos botões de ação
    const lockDoorBtn = document.getElementById('lockDoorBtn');
    const unlockDoorBtn = document.getElementById('unlockDoorBtn');
    
    if (lockDoorBtn && unlockDoorBtn) {
        if (door.status === 'locked') {
            // Se a porta está trancada, mostrar apenas o botão de destrancar
            lockDoorBtn.style.display = 'none';
            unlockDoorBtn.style.display = 'inline-block';
        } else {
            // Se a porta está destrancada, mostrar apenas o botão de trancar
            lockDoorBtn.style.display = 'inline-block';
            unlockDoorBtn.style.display = 'none';
        }
    }
    
    // Abrir o modal de forma segura
    const modal = document.getElementById('controlDoorModal');
    if (modal) {
        // Garantir que o modal seja exibido
        modal.style.display = 'flex';
        
        // Forçar visibilidade
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        modal.style.zIndex = '1000';
        
        // Adicionar classe 'show' se relevante para seu CSS
        modal.classList.add('show');
        
        console.log('Modal de controle aberto:', modal.style.display);
    } else {
        console.error('Modal de controle não encontrado! Elemento com ID "controlDoorModal" não existe.');
        alert('Erro ao abrir modal de controle. Consulte o console para detalhes.');
    }
}

// Verificar se modais existem no DOM após carregamento da página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando elementos do modal...');
    
    const doorModal = document.getElementById('doorModal');
    const controlDoorModal = document.getElementById('controlDoorModal');
    
    console.log('doorModal existe?', !!doorModal);
    console.log('controlDoorModal existe?', !!controlDoorModal);
    
    // Examinar HTML de modais se existirem
    if (doorModal) {
        console.log('Estrutura doorModal:', doorModal.outerHTML.substring(0, 100) + '...');
    }
    
    if (controlDoorModal) {
        console.log('Estrutura controlDoorModal:', controlDoorModal.outerHTML.substring(0, 100) + '...');
    }
});

/**
 * Controla uma porta (tranca/destranca)
 * @param {string} action - A ação a ser realizada (lock/unlock)
 */
function controlDoor(action) {
    if (!currentDoorId) {
        console.error('ID da porta não definido');
        return;
    }
    
    const statusUpdate = {
        status: action === 'lock' ? 'locked' : 'unlocked',
        last_status_change: new Date().toISOString()
    };
    
    // Atualizar status no Firebase
    doorsRef.child(currentDoorId).update(statusUpdate)
        .then(() => {
            // Registrar log de acesso (opcional)
            const user = firebase.auth().currentUser;
            if (user) {
                const logData = {
                    user_id: user.uid,
                    user_name: user.displayName || user.email,
                    door_id: currentDoorId,
                    door_name: doors.find(d => d.id === currentDoorId)?.name || 'Porta',
                    action: action === 'lock' ? 'access_denied' : 'access_granted',
                    method: 'web',
                    timestamp: new Date().toISOString()
                };
                
                return firebase.database().ref('access_logs').push(logData);
            }
        })
        .then(() => {
            closeModal('controlDoorModal');
            const actionText = action === 'lock' ? 'trancada' : 'destrancada';
            showNotification(`Porta ${actionText} com sucesso`, 'success');
        })
        .catch(error => {
            console.error(`Erro ao ${action === 'lock' ? 'trancar' : 'destrancar'} porta:`, error);
            showNotification(`Erro ao controlar porta: ${error.message}`, 'error');
        });
}

/**
 * Função de fechamento de modal aprimorada
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        console.log(`Modal ${modalId} fechado`);
    } else {
        console.error(`Modal com id ${modalId} não encontrado para fechar`);
    }
}

/**
 * Mostra uma notificação na tela
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    console.log(`Notificação (${type}): ${message}`);
    
    // Verificar se já existe um container de notificações
    let container = document.getElementById('notificationContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Ícone com base no tipo
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Adicionar ao container
    container.appendChild(notification);
    
    // Adicionar classe para animar
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Evento para fechar notificação
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

/**
 * Formata uma data para exibição
 * @param {Date} date - A data a ser formatada
 * @returns {string} A data formatada
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        try {
            date = new Date(date);
        } catch(e) {
            return 'Data inválida';
        }
    }
    
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}