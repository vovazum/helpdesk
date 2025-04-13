const Koa = require('koa');
const cors = require('@koa/cors');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const fs = require('fs').promises;
const path = require('path');

const app = new Koa();
const router = new Router();

const DATA_FILE = path.join(__dirname, 'tickets.json');

// Инициализация данных
async function initData() {
    try {
      await fs.access(DATA_FILE);
      // Проверим, что файл не пустой
      const content = await fs.readFile(DATA_FILE, 'utf8');
      if (!content.trim()) {
        throw new Error('File is empty');
      }
      JSON.parse(content); // Проверим валидность JSON
      console.log('Valid data file exists');
    } catch {
      console.log('Creating initial data file');
      const initialData = {
        tickets: [
          {
            id: '1',
            name: 'Проблема с принтером',
            description: 'Принтер не печатает документы',
            status: false,
            created: Date.now()
          },
          {
            id: '2',
            name: 'Обновить ПО',
            description: 'Необходимо обновить Windows до последней версии',
            status: true,
            created: Date.now() - 86400000
          }
        ]
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
  }

// Чтение данных
async function readData() {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      if (!data.trim()) {
        throw new Error('File is empty');
      }
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading data file:', err);
      // Восстановим данные при ошибке
      await initData();
      return readData(); // Попробуем снова
    }
  }

// Запись данных
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing data file:', err);
    throw err;
  }
}

// Генерация ID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true
}));

app.use(bodyParser({
  enableTypes: ['json'],
  jsonLimit: '10mb',
  strict: true,
  onerror: (err, ctx) => {
    console.error('Body parse error:', err);
    ctx.throw(422, 'Body parse error');
  }
}));

// Логгирование запросов
app.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url} - ${ms}ms`);
});

// Routes
router.get('/', async (ctx) => {
  ctx.body = {
    status: 'OK',
    message: 'HelpDesk API is running',
    timestamp: new Date().toISOString()
  };
});

// Получение тикетов
router.get('/tickets', async (ctx) => {
  try {
    const { method } = ctx.query;
    if (!method) {
      ctx.status = 400;
      ctx.body = { error: 'Method parameter is required' };
      return;
    }

    const data = await readData();

    if (method === 'allTickets') {
      const tickets = data.tickets.map(({ id, name, status, created }) => ({
        id,
        name,
        status,
        created
      }));
      ctx.body = tickets;
    } else if (method === 'ticketById') {
      const { id } = ctx.query;
      if (!id) {
        ctx.status = 400;
        ctx.body = { error: 'ID parameter is required' };
        return;
      }

      const ticket = data.tickets.find(t => t.id === id);
      if (ticket) {
        ctx.body = ticket;
      } else {
        ctx.status = 404;
        ctx.body = { error: 'Ticket not found' };
      }
    } else {
      ctx.status = 400;
      ctx.body = { error: 'Invalid method' };
    }
  } catch (err) {
    console.error('Error in GET /tickets:', err);
    ctx.status = 500;
    ctx.body = { 
      error: 'Internal server error',
      details: err.message 
    };
  }
});

// Обработка операций с тикетами
router.post('/tickets', async (ctx) => {
  try {
    const { method } = ctx.query;
    if (!method) {
      ctx.status = 400;
      ctx.body = { error: 'Method parameter is required' };
      return;
    }

    console.log('Request body:', ctx.request.body);
    const data = await readData();

    switch (method) {
      case 'createTicket': {
        const { name, description, status } = ctx.request.body;
        if (!name) {
          ctx.status = 400;
          ctx.body = { error: 'Name is required' };
          return;
        }

        const newTicket = {
          id: generateId(),
          name,
          description: description || '',
          status: Boolean(status),
          created: Date.now()
        };
        
        data.tickets.push(newTicket);
        await writeData(data);
        ctx.body = { 
          success: true, 
          id: newTicket.id,
          ticket: newTicket
        };
        break;
      }

      case 'updateTicket': {
        const { id, name, description, status } = ctx.request.body;
        if (!id) {
          ctx.status = 400;
          ctx.body = { error: 'ID is required' };
          return;
        }

        const ticketIndex = data.tickets.findIndex(t => t.id === id);
        if (ticketIndex === -1) {
          ctx.status = 404;
          ctx.body = { error: 'Ticket not found' };
          return;
        }

        data.tickets[ticketIndex] = {
          ...data.tickets[ticketIndex],
          name: name || data.tickets[ticketIndex].name,
          description: description || data.tickets[ticketIndex].description,
          status: status !== undefined ? Boolean(status) : data.tickets[ticketIndex].status
        };

        await writeData(data);
        ctx.body = { 
          success: true,
          ticket: data.tickets[ticketIndex]
        };
        break;
      }

      case 'deleteTicket': {
        const { id } = ctx.request.body;
        if (!id) {
          ctx.status = 400;
          ctx.body = { error: 'ID is required' };
          return;
        }

        const initialLength = data.tickets.length;
        data.tickets = data.tickets.filter(t => t.id !== id);
        
        if (data.tickets.length === initialLength) {
          ctx.status = 404;
          ctx.body = { error: 'Ticket not found' };
          return;
        }

        await writeData(data);
        ctx.body = { success: true };
        break;
      }

      case 'statusTicket': {
        const { id, status } = ctx.request.body;
        if (!id || status === undefined) {
          ctx.status = 400;
          ctx.body = { error: 'ID and status are required' };
          return;
        }

        const ticketIndex = data.tickets.findIndex(t => t.id === id);
        if (ticketIndex === -1) {
          ctx.status = 404;
          ctx.body = { error: 'Ticket not found' };
          return;
        }

        data.tickets[ticketIndex].status = Boolean(status);
        await writeData(data);
        ctx.body = { 
          success: true,
          ticket: data.tickets[ticketIndex]
        };
        break;
      }

      default:
        ctx.status = 400;
        ctx.body = { error: 'Invalid method' };
    }
  } catch (err) {
    console.error('Error in POST /tickets:', err);
    ctx.status = 500;
    ctx.body = { 
      error: 'Internal server error',
      details: err.message 
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Обработка ошибок
app.on('error', (err, ctx) => {
  console.error('Server error:', err, ctx);
});

// Запуск сервера
async function startServer() {
  try {
    await initData();
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();