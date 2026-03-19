// js/config.js - ATUALIZADO

// Configurações do sistema
const SYSTEM_CONFIG = {
  adminEmail: 'nunestrader1m@gmail.com',
  adminPassword: '@#2024#@',
  
  planos: [
    { id: 1, nome: 'Grátis', preco: 0, fotos: 5 },
    { id: 2, nome: 'Básico', preco: 50, fotos: 60 },
    { id: 3, nome: 'Premium', preco: 100, fotos: 200 }
  ],
  
  mpesaCode: '1021877',
  
  pontosLevantamento: [
    { id: 1, nome: 'George Dimitrov', endereco: 'Avenida de Mocambique', bairro: 'George Dimitrov' },
    { id: 2, nome: 'Alto Maé', endereco: 'Rua da Mesquita, Alto Maé, em frente ao mercado', bairro: 'Alto Maé' },
    { id: 3, nome: 'Marracuene Vila', endereco: 'Estrada Nacional Nº1, Marracuene Vila, próximo à estação de combustível', bairro: 'Marracuene' }
  ],
  
  categorias: {
    'eletronicos': 'Eletrônicos',
    'vestuario': 'Vestuário',
    'casa': 'Casa e Jardim',
    'automoveis': 'Automóveis',
    'outros': 'Outros'
  },
  
  statusPedido: {
    'pendente': 'Pendente',
    'pago': 'Pago',
    'processando': 'Processando',
    'enviado': 'Enviado',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado',
    'reembolsado': 'Reembolsado',
    'disputa': 'Em Disputa'
  },
  
  metodosPagamento: {
    'mpesa': 'M-Pesa',
    'emola': 'E-Mola',
    'transferencia': 'Transferência Bancária'
  },
  
  metodosEntrega: {
    'padrao': 'Entrega Padrão',
    'expresso': 'Entrega Expressa',
    'levantamento': 'Levantamento'
  }
};

// Constantes para o sistema
const APP_CONSTANTS = {
  itemsPerPage: 12,
  cartMaxItems: 50,
  maxProductImages: 5,
  maxProductTitleLength: 100,
  maxProductDescriptionLength: 2000,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
  retryAttempts: 3,
  cacheDuration: 5 * 60 * 1000 // 5 minutos em milissegundos
};

// Estatísticas iniciais
const INITIAL_STATS = {
  totalUsers: 0,
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0
};

// Funções de utilidade
function formatPrice(price) {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2
  }).format(price);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Cache simples
const cache = new Map();

async function cachedFetch(key, fetchFunction, ttl = APP_CONSTANTS.cacheDuration) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Exportar funções utilitárias
window.formatPrice = formatPrice;
window.formatDate = formatDate;
window.truncateText = truncateText;
window.cachedFetch = cachedFetch;