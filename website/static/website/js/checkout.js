// js/checkout.js

let cartItems = [];
let deliveryPrice = 0;
let serviceFee = 0;

// Carregar carrinho do usuário
async function loadCart() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            window.location.href = 'login.html?redirect=checkout';
            return;
        }

        // Buscar itens do carrinho com informações dos produtos
        const { data: cartData, error } = await supabase
            .from('carrinho')
            .select(`
                *,
                produtos:produto_id (
                    id,
                    nome,
                    preco,
                    imagem_url,
                    vendedor_id,
                    inclui_frete,
                    profiles!produtos_vendedor_id_fkey (nome)
                )
            `)
            .eq('usuario_id', user.id);

        if (error) throw error;

        cartItems = cartData || [];
        renderCartItems();
        updateCartSummary();
        updateCartCount();

    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        document.getElementById('cartItems').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar carrinho</h3>
                <p>${error.message}</p>
                <button onclick="loadCart()" class="btn-primary">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

// Renderizar itens do carrinho
function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    
    if (cartItems.length === 0) {
        cartItemsDiv.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Seu carrinho está vazio</h3>
                <p>Adicione produtos para continuar</p>
                <button class="btn-primary" onclick="window.location.href='produtos.html'">
                    <i class="fas fa-shopping-bag"></i> Ver Produtos
                </button>
            </div>
        `;
        return;
    }

    let itemsHTML = '';
    
    cartItems.forEach(item => {
        const product = item.produtos;
        const subtotal = product.preco * item.quantidade;
        const subtotalFormatted = formatPrice(subtotal);
        const priceFormatted = formatPrice(product.preco);
        
        itemsHTML += `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${product.imagem_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'}" 
                         alt="${product.nome}">
                </div>
                <div class="cart-item-details">
                    <h3>${product.nome}</h3>
                    <p class="seller">Vendedor: ${product.profiles?.nome || 'NunesTrader'}</p>
                    <p class="price">${priceFormatted} cada</p>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity('${item.id}', ${item.quantidade - 1})" ${item.quantidade <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <span>${item.quantidade}</span>
                    <button onclick="updateQuantity('${item.id}', ${item.quantidade + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-subtotal">
                    <span>${subtotalFormatted}</span>
                </div>
                <div class="cart-item-remove">
                    <button onclick="removeItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    cartItemsDiv.innerHTML = itemsHTML;
}

// Atualizar quantidade de um item
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
        await removeItem(itemId);
        return;
    }

    try {
        const { error } = await supabase
            .from('carrinho')
            .update({ quantidade: newQuantity })
            .eq('id', itemId);

        if (error) throw error;

        // Atualizar localmente
        const itemIndex = cartItems.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            cartItems[itemIndex].quantidade = newQuantity;
        }

        renderCartItems();
        updateCartSummary();

    } catch (error) {
        console.error('Erro ao atualizar quantidade:', error);
        alert('Erro ao atualizar quantidade: ' + error.message);
    }
}

// Remover item do carrinho
async function removeItem(itemId) {
    if (!confirm('Remover este item do carrinho?')) return;

    try {
        const { error } = await supabase
            .from('carrinho')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        // Atualizar localmente
        cartItems = cartItems.filter(item => item.id !== itemId);

        renderCartItems();
        updateCartSummary();
        updateCartCount();

    } catch (error) {
        console.error('Erro ao remover item:', error);
        alert('Erro ao remover item: ' + error.message);
    }
}

// Atualizar resumo do carrinho
function updateCartSummary() {
    const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.produtos.preco * item.quantidade);
    }, 0);

    // Calcular taxa de serviço (5% do subtotal, mínimo 10 MT)
    serviceFee = Math.max(subtotal * 0.05, 10);
    
    const total = subtotal + deliveryPrice + serviceFee;

    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('freteTotal').textContent = formatPrice(deliveryPrice);
    document.getElementById('taxaServico').textContent = formatPrice(serviceFee);
    document.getElementById('totalAmount').innerHTML = `<strong>${formatPrice(total)}</strong>`;
    
    // Atualizar também no modal de M-Pesa
    document.getElementById('mpesaAmount').textContent = formatPrice(total);
}

// Atualizar contador do carrinho
async function updateCartCount() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
        document.getElementById('cartCount').textContent = totalItems;
    }
}

// Calcular frete de entrega
async function calculateDelivery() {
    const city = document.getElementById('userCity').value;
    const district = document.getElementById('userDistrict').value;
    
    if (!city || !district) {
        alert('Por favor, preencha sua cidade e bairro');
        return;
    }

    // Mostrar loading
    const calcBtn = document.querySelector('#locationInput .btn-primary');
    const originalText = calcBtn.innerHTML;
    calcBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
    calcBtn.disabled = true;

    try {
        // Simulação de cálculo de frete
        // Em produção, integrar com API de cálculo de distância
        
        // Preços base por cidade
        const cityPrices = {
            'maputo': { standard: 150, express: 250 },
            'beira': { standard: 200, express: 300 },
            'nampula': { standard: 250, express: 350 },
            'default': { standard: 300, express: 450 }
        };

        const cityLower = city.toLowerCase();
        let prices;
        
        if (cityLower.includes('maputo')) prices = cityPrices.maputo;
        else if (cityLower.includes('beira')) prices = cityPrices.beira;
        else if (cityLower.includes('nampula')) prices = cityPrices.nampula;
        else prices = cityPrices.default;

        // Ajustar pelo número de itens (simulação)
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
        const multiplier = Math.max(1, Math.ceil(itemCount / 3));

        deliveryPrice = prices.standard * multiplier;
        const expressPrice = prices.express * multiplier;

        // Atualizar preços na interface
        document.getElementById('deliveryStandardPrice').textContent = formatPrice(deliveryPrice);
        document.getElementById('deliveryExpressPrice').textContent = formatPrice(expressPrice);
        
        // Atualizar resumo
        updateCartSummary();
        
        // Habilitar botão de continuar
        document.getElementById('continueToPaymentBtn').disabled = false;

        alert('Frete calculado com sucesso!');

    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        alert('Erro ao calcular frete: ' + error.message);
    } finally {
        calcBtn.innerHTML = originalText;
        calcBtn.disabled = false;
    }
}

// Formatador de preço
function formatPrice(price) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2
    }).format(price);
}

// Criar pedido no banco de dados
async function createOrder(orderData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('Usuário não autenticado');

        // Calcular totais
        const subtotal = cartItems.reduce((sum, item) => {
            return sum + (item.produtos.preco * item.quantidade);
        }, 0);

        const total = subtotal + deliveryPrice + serviceFee;

        // Criar pedido principal
        const { data: order, error: orderError } = await supabase
            .from('pedidos')
            .insert({
                comprador_id: user.id,
                vendedor_id: cartItems[0]?.produtos.vendedor_id, // Primeiro vendedor
                total: total,
                valor_frete: deliveryPrice,
                status: 'pendente',
                metodo_pagamento: orderData.paymentMethod,
                endereco_entrega: orderData.deliveryAddress,
                ponto_levantamento: orderData.pickupPoint
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Criar itens do pedido
        const orderItems = cartItems.map(item => ({
            pedido_id: order.id,
            produto_id: item.produtos.id,
            quantidade: item.quantidade,
            preco_unitario: item.produtos.preco,
            subtotal: item.produtos.preco * item.quantidade
        }));

        const { error: itemsError } = await supabase
            .from('pedido_itens')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Se for M-Pesa, registrar pagamento
        if (orderData.paymentMethod === 'mpesa') {
            const { error: paymentError } = await supabase
                .from('pagamentos')
                .insert({
                    pedido_id: order.id,
                    metodo: 'mpesa',
                    valor: total,
                    referencia: orderData.mpesaReference,
                    comprovante_url: orderData.proofUrl,
                    status: 'pendente'
                });

            if (paymentError) throw paymentError;
        }

        // Limpar carrinho
        await supabase
            .from('carrinho')
            .delete()
            .eq('usuario_id', user.id);

        // Enviar notificação por e-mail (simulação)
        await sendOrderConfirmationEmail(user.email, order.id, total);

        return { success: true, order: order };

    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        return { success: false, error: error.message };
    }
}

// Enviar e-mail de confirmação (simulação)
async function sendOrderConfirmationEmail(email, orderId, total) {
    // Em produção, integrar com serviço de e-mail
    console.log(`E-mail enviado para ${email}: Pedido #${orderId} confirmado - Total: ${total} MT`);
    
    // Simular envio
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// Validar formulário de pagamento
function validatePaymentForm() {
    const paymentMethod = document.querySelector('input[name="paymentOption"]:checked').value;
    
    if (paymentMethod === 'mpesa') {
        const phone = document.getElementById('mpesaPhone').value;
        const reference = document.getElementById('mpesaReference').value;
        const proof = document.getElementById('mpesaProof').files[0];
        
        if (!phone || phone.length < 9) {
            alert('Por favor, insira um número de telefone válido');
            return false;
        }
        
        if (!reference) {
            alert('Por favor, insira a referência do pagamento');
            return false;
        }
        
        if (!proof) {
            alert('Por favor, envie o comprovante do pagamento');
            return false;
        }
        
        return true;
    }
    
    if (paymentMethod === 'bank') {
        const reference = document.getElementById('bankReference').value;
        const proof = document.getElementById('bankProof').files[0];
        
        if (!reference) {
            alert('Por favor, insira a referência da transferência');
            return false;
        }
        
        if (!proof) {
            alert('Por favor, envie o comprovante da transferência');
            return false;
        }
        
        return true;
    }
    
    return true; // Para dinheiro na entrega
}

// Upload de comprovante
async function uploadPaymentProof(file) {
    // Em produção, implementar upload para Supabase Storage
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Nenhum arquivo selecionado'));
            return;
        }

        // Simular upload
        setTimeout(() => {
            resolve(`https://supabase-storage.com/comprovantes/${Date.now()}_${file.name}`);
        }, 1500);
    });
}

// Gerar referência automática
function generateReference(prefix = 'ORD') {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// Inicializar referências
document.addEventListener('DOMContentLoaded', () => {
    // Gerar referência para M-Pesa
    document.getElementById('mpesaReference').value = generateReference('MP');
    
    // Gerar referência para transferência bancária
    document.getElementById('bankReference').value = generateReference('TR');
});

// Exportar funções para uso global
window.loadCart = loadCart;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.calculateDelivery = calculateDelivery;
window.createOrder = createOrder;