// js/assinaturas.js

// Obter assinatura ativa do usuário
async function getActiveSubscription(userId) {
    try {
        const { data: subscription, error } = await supabase
            .from('assinaturas')
            .select(`
                *,
                plano:plano_id (*)
            `)
            .eq('usuario_id', userId)
            .eq('status', 'ativa')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return { success: true, subscription: subscription || null };

    } catch (error) {
        console.error('Erro ao obter assinatura:', error);
        return { success: false, error: error.message };
    }
}

// Assinar um plano
async function subscribeToPlan(planId, paymentMethod, paymentData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Verificar se já tem assinatura ativa
        const { data: existingSubscription } = await supabase
            .from('assinaturas')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('status', 'ativa')
            .single();

        if (existingSubscription) {
            return { success: false, error: 'Você já possui uma assinatura ativa' };
        }

        // Obter detalhes do plano
        const { data: plan, error: planError } = await supabase
            .from('planos')
            .select('*')
            .eq('id', planId)
            .eq('ativo', true)
            .single();

        if (planError) throw planError;

        // Criar assinatura
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.duracao_dias);

        const { data: subscription, error: subError } = await supabase
            .from('assinaturas')
            .insert({
                usuario_id: user.id,
                plano_id: planId,
                data_inicio: startDate.toISOString().split('T')[0],
                data_fim: endDate.toISOString().split('T')[0],
                metodo_pagamento: paymentMethod,
                referencia_pagamento: paymentData.reference,
                comprovante_url: paymentData.proofUrl,
                valor_pago: plan.preco_mensal,
                status: 'ativa'
            })
            .select()
            .single();

        if (subError) throw subError;

        // Atualizar perfil do usuário
        await supabase
            .from('profiles')
            .update({
                plano_id: planId,
                fotos_disponiveis: plan.fotos_mensais,
                data_vencimento_plano: endDate.toISOString().split('T')[0]
            })
            .eq('id', user.id);

        // Registrar pagamento
        await createPaymentRecord({
            tipo: 'assinatura',
            referencia: `ASS${subscription.id.substring(0, 8)}`,
            valor: plan.preco_mensal,
            metodo: paymentMethod,
            comprovante_url: paymentData.proofUrl,
            usuario_id: user.id,
            assinatura_id: subscription.id
        });

        return { success: true, subscription, message: 'Assinatura ativada com sucesso!' };

    } catch (error) {
        console.error('Erro ao assinar plano:', error);
        return { success: false, error: error.message };
    }
}

// Cancelar assinatura
async function cancelSubscription(subscriptionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { data: subscription, error } = await supabase
            .from('assinaturas')
            .update({
                status: 'cancelada',
                data_cancelamento: new Date().toISOString().split('T')[0],
                renovacao_automatica: false
            })
            .eq('id', subscriptionId)
            .eq('usuario_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, subscription, message: 'Assinatura cancelada com sucesso' };

    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        return { success: false, error: error.message };
    }
}

// Renovar assinatura
async function renewSubscription(subscriptionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Obter assinatura atual
        const { data: currentSub, error: fetchError } = await supabase
            .from('assinaturas')
            .select('*, plano:plano_id(*)')
            .eq('id', subscriptionId)
            .eq('usuario_id', user.id)
            .single();

        if (fetchError) throw fetchError;

        const newStartDate = new Date();
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + currentSub.plano.duracao_dias);

        const { data: subscription, error } = await supabase
            .from('assinaturas')
            .update({
                data_inicio: newStartDate.toISOString().split('T')[0],
                data_fim: newEndDate.toISOString().split('T')[0],
                data_renovacao: new Date().toISOString().split('T')[0],
                status: 'ativa'
            })
            .eq('id', subscriptionId)
            .eq('usuario_id', user.id)
            .select()
            .single();

        if (error) throw error;

        // Atualizar perfil
        await supabase
            .from('profiles')
            .update({
                fotos_disponiveis: currentSub.plano.fotos_mensais,
                data_vencimento_plano: newEndDate.toISOString().split('T')[0]
            })
            .eq('id', user.id);

        return { success: true, subscription, message: 'Assinatura renovada com sucesso!' };

    } catch (error) {
        console.error('Erro ao renovar assinatura:', error);
        return { success: false, error: error.message };
    }
}

// Obter histórico de assinaturas
async function getSubscriptionHistory(userId) {
    try {
        const { data: subscriptions, error } = await supabase
            .from('assinaturas')
            .select(`
                *,
                plano:plano_id (*)
            `)
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, subscriptions: subscriptions || [] };

    } catch (error) {
        console.error('Erro ao obter histórico de assinaturas:', error);
        return { success: false, error: error.message };
    }
}

// Verificar status da assinatura
async function checkSubscriptionStatus(userId) {
    try {
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('status, data_fim')
            .eq('usuario_id', userId)
            .eq('status', 'ativa')
            .single();

        if (!subscription) {
            return { success: true, status: 'inativa', message: 'Nenhuma assinatura ativa' };
        }

        const endDate = new Date(subscription.data_fim);
        const today = new Date();
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        let status = 'ativa';
        let message = `Assinatura ativa. ${daysRemaining} dias restantes.`;

        if (daysRemaining <= 0) {
            status = 'expirada';
            message = 'Assinatura expirada. Renove para continuar publicando.';
        } else if (daysRemaining <= 7) {
            status = 'prestes_a_vencer';
            message = `Sua assinatura vence em ${daysRemaining} dias.`;
        }

        return { success: true, status, message, daysRemaining };

    } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
        return { success: false, error: error.message };
    }
}

// Registrar pagamento
async function createPaymentRecord(paymentData) {
    try {
        const { data: payment, error } = await supabase
            .from('pagamentos')
            .insert({
                usuario_id: paymentData.usuario_id,
                assinatura_id: paymentData.assinatura_id,
                pedido_id: paymentData.pedido_id,
                metodo: paymentData.metodo,
                valor: paymentData.valor,
                referencia: paymentData.referencia,
                comprovante_url: paymentData.comprovante_url,
                status: 'concluido',
                data_processamento: new Date()
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, payment };

    } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        return { success: false, error: error.message };
    }
}

// Verificar pagamento pendente
async function verifyPayment(paymentId) {
    try {
        const { data: payment, error } = await supabase
            .from('pagamentos')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        // Em produção, integrar com gateway de pagamento
        // Esta é uma simulação
        const isVerified = payment.status === 'concluido' || 
                          (payment.metodo === 'mpesa' && payment.referencia);

        return { 
            success: true, 
            verified: isVerified, 
            payment 
        };

    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return { success: false, error: error.message };
    }
}

// Obter histórico de pagamentos
async function getPaymentHistory(userId, tipo = 'todos') {
    try {
        let query = supabase
            .from('pagamentos')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false });

        if (tipo !== 'todos') {
            query = query.eq('tipo', tipo);
        }

        const { data: payments, error } = await query;

        if (error) throw error;

        return { success: true, payments: payments || [] };

    } catch (error) {
        console.error('Erro ao obter histórico de pagamentos:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funções
window.getActiveSubscription = getActiveSubscription;
window.subscribeToPlan = subscribeToPlan;
window.cancelSubscription = cancelSubscription;
window.renewSubscription = renewSubscription;
window.getSubscriptionHistory = getSubscriptionHistory;
window.checkSubscriptionStatus = checkSubscriptionStatus;
window.verifyPayment = verifyPayment;
window.getPaymentHistory = getPaymentHistory;