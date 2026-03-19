// js/produtos.js

let currentPage = 1;
const itemsPerPage = 12;
let allProducts = [];
let filteredProducts = [];

// Verificar sessão usando localStorage
function verificarSessao() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/login.html';
    }
}

verificarSessao();

// Função utilitária para checar se usuário é admin
export function isAdmin(user) {
    if (!user) return false;
    return user.type === 'admin' || user.email === 'nunestrader1m@gmail.com';
}

// Função para exibir/ocultar botões de publicação conforme admin
export function showAdminProductControls() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!isAdmin(user)) {
        // Esconde botões de publicação se não for admin
        const publishBtns = document.querySelectorAll('.btn-publish-product, .btn-edit-product');
        publishBtns.forEach(btn => btn.style.display = 'none');
    }
}

export async function listarProdutos() {
    try {
        const response = await fetch('/api/produtos?ativo=true');
        if (!response.ok) {
            throw new Error('Erro ao listar produtos');
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Funções utilitárias para produtos e categorias

// Formatador de preço
export function formatPrice(price) {
    return price ? Number(price).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' }) : '---';
}

// Obter nome da categoria
export function getCategoryName(category) {
    const categories = {
        'eletronicos': 'Eletrônicos',
        'vestuario': 'Vestuário',
        'casa': 'Casa e Jardim',
        'automoveis': 'Automóveis',
        'outros': 'Outros'
    };
    
    return categories[category] || category;
}

// Carregar produtos em destaque (exemplo: produtos mais recentes)
export async function loadFeaturedProducts() {
    try {
        const featuredDiv = document.getElementById('featuredProducts');
        const res = await fetch('/api/products?sort=recentes&limit=8');
        if (!res.ok) throw new Error('Erro ao buscar produtos em destaque');
        const products = await res.json();
        if (products && products.length > 0) {
            let productsHTML = '';
            products.forEach(product => {
                const priceFormatted = formatPrice(product.preco);
                const isVendedorVerificado = product.vendedor_verificado;
                productsHTML += `
                    <div class="product-card">
                        <div class="product-image" onclick="openProductModal('${product.id}')">
                            <img src="${product.imagem_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                                 alt="${product.nome}">
                            ${isVendedorVerificado ? 
                                '<div class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</div>' : ''}
                        </div>
                        <div class="product-info">
                            <h3 onclick="openProductModal('${product.id}')">${product.nome}</h3>
                            <p class="product-category">
                                <i class="fas fa-tag"></i> ${getCategoryName(product.categoria)}
                            </p>
                            <p class="product-price">${priceFormatted}</p>
                            <div class="product-actions">
                                <button class="btn-primary btn-sm" onclick="addToCart('${product.id}')">
                                    <i class="fas fa-cart-plus"></i> Comprar
                                </button>
                                <button class="btn-secondary btn-sm" onclick="toggleFavorite('${product.id}')">
                                    <i class="fas fa-heart"></i> Favoritar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            featuredDiv.innerHTML = productsHTML;
        } else {
            featuredDiv.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>Nenhum produto em destaque</h3>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('featuredProducts').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar produtos em destaque.</p>
            </div>
        `;
    }
}

// Função principal para carregar produtos
async function loadProducts(searchTerm = '') {
    try {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Carregando produtos...</p>
            </div>
        `;

        // Construir query base
        let query = `/api/produtos?status=ativo`;

        // Aplicar filtros
        const category = document.getElementById('categoryFilter').value;
        const priceRange = document.getElementById('priceFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        if (category) {
            query += `&categoria=${category}`;
        }

        if (priceRange) {
            const [min, max] = priceRange.split('-');
            if (max === '+') {
                query += `&preco_gte=${min}`;
            } else {
                query += `&preco_gte=${min}&preco_lte=${max}`;
            }
        }

        if (searchTerm) {
            query += `&search=${encodeURIComponent(searchTerm)}`;
        }

        // Aplicar ordenação
        switch (sortBy) {
            case 'preco_asc':
                query += `&sort=preco_asc`;
                break;
            case 'preco_desc':
                query += `&sort=preco_desc`;
                break;
            case 'popular':
                query += `&sort=popular`;
                break;
            default:
                query += `&sort=created_at_desc`;
        }

        const response = await fetch(query);
        if (!response.ok) {
            throw new Error('Erro ao carregar produtos');
        }

        const products = await response.json();

        allProducts = products || [];
        filteredProducts = [...allProducts];

        // Atualizar contador
        document.getElementById('productsCount').textContent = 
            `${filteredProducts.length} produtos encontrados`;

        // Renderizar produtos
        renderProducts(currentPage);

        // Atualizar paginação
        updatePagination(filteredProducts.length);

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('productsGrid').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar produtos</h3>
                <p>${error.message}</p>
                <button onclick="loadProducts()" class="btn-primary">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

// Renderizar produtos na página atual
function renderProducts(page) {
    const productsGrid = document.getElementById('productsGrid');
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    if (pageProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente alterar os filtros ou buscar por outro termo</p>
            </div>
        `;
        return;
    }

    let productsHTML = '';
    
    pageProducts.forEach(product => {
        const priceFormatted = formatPrice(product.preco);
        const isVendedorVerificado = product.profiles && product.profiles.verificado;
        
        productsHTML += `
            <div class="product-card">
                <div class="product-image" onclick="openProductModal('${product.id}')">
                    <img src="${product.imagem_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                         alt="${product.nome}">
                    ${isVendedorVerificado ? 
                        '<div class="verified-badge"><i class="fas fa-check-circle"></i> Vendedor Verificado</div>' : ''}
                    ${product.inclui_frete ? 
                        '<div class="frete-badge"><i class="fas fa-truck"></i> Frete Disponível</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductModal('${product.id}')">${product.nome}</h3>
                    <p class="product-category">
                        <i class="fas fa-tag"></i> ${getCategoryName(product.categoria)}
                    </p>
                    <p class="product-price">${priceFormatted}</p>
                    <div class="product-seller">
                        <i class="fas fa-user"></i> ${product.profiles?.nome || 'Vendedor'}
                    </div>
                    <div class="product-actions">
                        <button class="btn-primary btn-sm" onclick="addToCart('${product.id}')">
                            <i class="fas fa-cart-plus"></i> Comprar
                        </button>
                        <button class="btn-secondary btn-sm" onclick="openProductModal('${product.id}')">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    productsGrid.innerHTML = productsHTML;
}

// Atualizar paginação
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationDiv = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-left"></i>
        </button>
    `;

    // Mostrar páginas próximas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="goToPage(${i})" class="${currentPage === i ? 'active' : ''}">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-right"></i>
        </button>
        <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;

    paginationDiv.innerHTML = paginationHTML;
}

// Navegar para página
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProducts(page);
    updatePagination(filteredProducts.length);
    
    // Rolagem suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Carregar produtos por categoria
async function loadProductsByCategory(category) {
    document.getElementById('categoryFilter').value = category;
    await loadProducts();
}

// Exportar funções para uso global
window.loadProducts = loadProducts;
window.loadProductsByCategory = loadProductsByCategory;
window.openProductModal = openProductModal;
window.addToCart = addToCart;