import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/tickets';
    const ticketsList = document.getElementById('ticketsList');
    const addTicketBtn = document.getElementById('addTicketBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const ticketModal = document.getElementById('ticketModal');
    const confirmModal = document.getElementById('confirmModal');
    const detailsModal = document.getElementById('detailsModal');
    const ticketForm = document.getElementById('ticketForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmDelete = document.getElementById('confirmDelete');
    const closeDetails = document.getElementById('closeDetails');
    
    let currentTicketId = null;
  
    // Загрузка тикетов
    async function loadTickets() {
      try {
        ticketsList.innerHTML = '<div class="loading">Загрузка...</div>';
        
        const response = await fetch(`${API_URL}?method=allTickets`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Ошибка загрузки');
        }
        
        const tickets = await response.json();
        renderTickets(tickets);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        ticketsList.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
      }
    }
  
    // Отображение тикетов
    function renderTickets(tickets) {
      if (!tickets || tickets.length === 0) {
        ticketsList.innerHTML = '<div class="empty">Нет тикетов</div>';
        return;
      }
  
      ticketsList.innerHTML = '';
      tickets.forEach(ticket => {
        const ticketElement = document.createElement('div');
        ticketElement.className = 'ticket';
        ticketElement.dataset.id = ticket.id;
        
        ticketElement.innerHTML = `
          <div class="ticket-info">
            <div class="ticket-name">${ticket.name}</div>
            <div class="ticket-date">${new Date(ticket.created).toLocaleString()}</div>
          </div>
          <div class="ticket-actions">
            <div class="ticket-status ${ticket.status ? 'done' : ''}" data-action="toggle"></div>
            <button class="btn" data-action="edit"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn" data-action="delete"><i class="fas fa-times"></i></button>
          </div>
        `;
        
        ticketsList.appendChild(ticketElement);
      });
    }
  
    // Показать модальное окно
    function showModal(modal, title = '') {
      if (title) {
        const titleElement = modal.querySelector('h2');
        if (titleElement) titleElement.textContent = title;
      }
      
      modalOverlay.classList.remove('hidden');
      Array.from(modalOverlay.querySelectorAll('.modal')).forEach(m => {
        m.style.display = 'none';
      });
      modal.style.display = 'block';
    }
  
    // Скрыть модальное окно
    function hideModal() {
      modalOverlay.classList.add('hidden');
      currentTicketId = null;
    }
  
    // Заполнить форму данными тикета
    async function fillTicketForm(id) {
      try {
        const response = await fetch(`${API_URL}?method=ticketById&id=${id}`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Ошибка загрузки');
        }
        
        const ticket = await response.json();
        document.getElementById('ticketId').value = ticket.id;
        document.getElementById('ticketName').value = ticket.name;
        document.getElementById('ticketDescription').value = ticket.description || '';
        document.getElementById('ticketStatus').checked = ticket.status;
      } catch (error) {
        console.error('Ошибка заполнения формы:', error);
        alert(`Ошибка: ${error.message}`);
      }
    }
  
    // Обработчики событий
    addTicketBtn.addEventListener('click', () => {
      ticketForm.reset();
      document.getElementById('modalTitle').textContent = 'Добавить тикет';
      showModal(ticketModal);
    });
  
    cancelBtn.addEventListener('click', hideModal);
    confirmCancel.addEventListener('click', hideModal);
    closeDetails.addEventListener('click', hideModal);
  
    // Обработка кликов по списку тикетов
    ticketsList.addEventListener('click', async (e) => {
      const ticketElement = e.target.closest('.ticket');
      if (!ticketElement) return;
      
      const ticketId = ticketElement.dataset.id;
      const action = e.target.dataset.action || 
                   (e.target.closest('[data-action]')?.dataset.action);
  
      if (action === 'toggle') {
        // Изменение статуса
        const status = e.target.classList.contains('done');
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              method: 'statusTicket',
              id: ticketId,
              status: !status
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка изменения статуса');
          }
          
          loadTickets();
        } catch (error) {
          console.error('Ошибка изменения статуса:', error);
          alert(`Ошибка: ${error.message}`);
        }
      } else if (action === 'edit') {
        // Редактирование
        currentTicketId = ticketId;
        document.getElementById('modalTitle').textContent = 'Редактировать тикет';
        await fillTicketForm(ticketId);
        showModal(ticketModal);
      } else if (action === 'delete') {
        // Удаление
        currentTicketId = ticketId;
        showModal(confirmModal, 'Подтверждение удаления');
      } else if (!action) {
        // Просмотр деталей
        try {
          const response = await fetch(`${API_URL}?method=ticketById&id=${ticketId}`);
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка загрузки');
          }
          
          const ticket = await response.json();
          document.getElementById('detailsContent').innerHTML = `
            <p><strong>Название:</strong> ${ticket.name}</p>
            <p><strong>Статус:</strong> ${ticket.status ? 'Выполнено' : 'Не выполнено'}</p>
            <p><strong>Дата создания:</strong> ${new Date(ticket.created).toLocaleString()}</p>
            <p><strong>Описание:</strong></p>
            <p>${ticket.description || 'Нет описания'}</p>
          `;
          showModal(detailsModal, 'Детали тикета');
        } catch (error) {
          console.error('Ошибка загрузки деталей:', error);
          alert(`Ошибка: ${error.message}`);
        }
      }
    });
  
    // Подтверждение удаления
    confirmDelete.addEventListener('click', async () => {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            method: 'deleteTicket',
            id: currentTicketId
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Ошибка удаления');
        }
        
        hideModal();
        loadTickets();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert(`Ошибка: ${error.message}`);
      }
    });
  
    // Обработка формы
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
  
        try {
          const id = document.getElementById('ticketId').value;
          const name = document.getElementById('ticketName').value.trim();
          const description = document.getElementById('ticketDescription').value.trim();
          const status = document.getElementById('ticketStatus').checked;
  
          if (!name) {
            throw new Error('Пожалуйста, введите краткое описание');
          }
  
          const method = id ? 'updateTicket' : 'createTicket';
          const payload = {
            method,
            id: id || undefined, // Не отправляем null
            name,
            description,
            status
          };
  
          console.log('Sending:', payload);
  
          const response = await fetch(API_URL + '?method=' + method, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
  
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error ${response.status}`);
          }
  
          const result = await response.json();
          console.log('Received:', result);
  
          if (!result.success) {
            throw new Error(result.error || 'Неизвестная ошибка сервера');
          }
  
          hideModal();
          await loadTickets();
          
        } catch (error) {
          console.error('Save error:', error);
          alert(`Ошибка при сохранении: ${error.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Сохранить';
        }
      });
  
  
    // Инициализация
    loadTickets();
});