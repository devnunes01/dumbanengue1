// js/interacao.js

// ========== AVALIAÇÕES ==========

// Adicionar avaliação
async function addReview(reviewData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Verificar se pedido foi entregue e se comprador pode avaliar
        const { data: order, error: orderError } = await supabase
            .from('pedidos')
            .select('status, comprador_id, vendedor_id')
            .eq('id', reviewData.pedido_id)
            .single();

        if (orderError) throw orderError;

        if (order.status !== 'entregue') {
            return { success: false, error: 'Apenas pedidos entregues podem ser avaliados' };
        }

        if (order.comprador_id !== user.id) {
            return { success: false, error: 'Apenas o comprador pode avaliar este pedido' };
        }

        // Verificar se já existe avaliação para este pedido
        const { data: existingReview } = await supabase
            .from('avaliacoes')
            .select('id')
            .eq('pedido_id', reviewData.pedido_id)
            .single();

        if (existingReview) {
            return { success: false, error: 'Este pedido já foi avaliado' };
        }

        // Criar avaliação
        const { data: review, error } = await supabase
            .from('avaliacoes')
            .insert({
                pedido_id: reviewData.pedido_id,
                produto_id: reviewData.produto_id,
                vendedor_id: order.vendedor_id,
                comprador_id: user.id,
                nota_produto: reviewData.nota_produto,
                nota_vendedor: reviewData.nota_vendedor,
                nota_entrega: reviewData.nota_entrega,
                comentario_produto: reviewData.comentario_produto,
                comentario_vendedor: reviewData.comentario_vendedor,
                comentario_entrega: reviewData.comentario_entrega,
                publicada: true
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, review, message: 'Avaliação publicada com sucesso!' };

    } catch (error) {
        console.error('Erro ao adicionar avaliação:', error);
        return { success: false, error: error.message };
    }
}

// Obter avaliações do produto
async function getProductReviews(productId, page = 1, limit = 10) {
    try {
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: reviews, error, count } = await supabase
            .from('avaliacoes')
            .select(`
                *,
                comprador:comprador_id (nome, cidade),
                pedido:pedido_id (numero_pedido, created_at)
            `, { count: 'exact' })
            .eq('produto_id', productId)
            .eq('publicada', true)
            .range(start, end)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const average = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.nota_produto, 0) / reviews.length
            : 0;

        return { 
            success: true, 
            reviews: reviews || [], 
            average: parseFloat(average.toFixed(1)),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
        };

    } catch (error) {
        console.error('Erro ao obter avaliações do produto:', error);
        return { success: false, error: error.message };
    }
}

// Obter avaliações do vendedor
async function getVendorReviews(vendorId, page = 1, limit = 10) {
    try {
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: reviews, error, count } = await supabase
            .from('avaliacoes')
            .select(`
                *,
                comprador:comprador_id (nome, cidade),
                produto:produto_id (nome, imagem_principal_url),
                pedido:pedido_id (numero_pedido)
            `, { count: 'exact' })
            .eq('vendedor_id', vendorId)
            .eq('publicada', true)
            .range(start, end)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const average = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.nota_vendedor, 0) / reviews.length
            : 0;

        return { 
            success: true, 
            reviews: reviews || [], 
            average: parseFloat(average.toFixed(1)),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
        };

    } catch (error) {
        console.error('Erro ao obter avaliações do vendedor:', error);
        return { success: false, error: error.message };
    }
}

// Responder à avaliação (vendedor)
async function replyToReview(reviewId, resposta) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Verificar se usuário é o vendedor da avaliação
        const { data: review, error: checkError } = await supabase
            .from('avaliacoes')
            .select('vendedor_id')
            .eq('id', reviewId)
            .single();

        if (checkError) throw checkError;

        if (review.vendedor_id !== user.id) {
            return { success: false, error: 'Apenas o vendedor pode responder a esta avaliação' };
        }

        const { data: updatedReview, error } = await supabase
            .from('avaliacoes')
            .update({
                resposta_vendedor: resposta,
                data_resposta: new Date()
            })
            .eq('id', reviewId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, review: updatedReview, message: 'Resposta publicada!' };

    } catch (error) {
        console.error('Erro ao responder à avaliação:', error);
        return { success: false, error: error.message };
    }
}

// ========== MENSAGENS ==========

// Enviar mensagem
async function sendMessage(messageData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { data: message, error } = await supabase
            .from('mensagens')
            .insert({
                remetente_id: user.id,
                destinatario_id: messageData.destinatario_id,
                pedido_id: messageData.pedido_id,
                produto_id: messageData.produto_id,
                assunto: messageData.assunto,
                mensagem: messageData.mensagem,
                tipo: messageData.tipo || 'normal'
            })
            .select()
            .single();

        if (error) throw error;

        // Enviar notificação ao destinatário
        await sendNotification({
            usuario_id: messageData.destinatario_id,
            titulo: 'Nova mensagem',
            mensagem: messageData.assunto || 'Você recebeu uma nova mensagem',
            tipo: 'info',
            acao_url: `/mensagens/${message.id}`
        });

        return { success: true, message, message: 'Mensagem enviada!' };

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return { success: false, error: error.message };
    }
}

// Obter conversas
async function getConversations(userId) {
    try {
        // Obter IDs de usuários com quem há conversas
        const { data: conversations, error } = await supabase
            .from('mensagens')
            .select('remetente_id, destinatario_id, max(created_at) as ultima_mensagem')
            .or(`remetente_id.eq.${userId},destinatario_id.eq.${userId}`)
            .group('remetente_id, destinatario_id')
            .order('ultima_mensagem', { ascending: false });

        if (error) throw error;

        // Obter detalhes dos usuários
        const uniqueUserIds = new Set();
        conversations.forEach(conv => {
            if (conv.remetente_id !== userId) uniqueUserIds.add(conv.remetente_id);
            if (conv.destinatario_id !== userId) uniqueUserIds.add(conv.destinatario_id);
        });

        const userIds = Array.from(uniqueUserIds);
        
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, nome, email, tipo, verificado')
            .in('id', userIds);

        if (usersError) throw usersError;

        // Obter última mensagem de cada conversa
        const detailedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const otherUserId = conv.remetente_id === userId ? conv.destinatario_id : conv.remetente_id;
                const user = users.find(u => u.id === otherUserId);

                const { data: lastMessage } = await supabase
                    .from('mensagens')
                    .select('*')
                    .or(`and(remetente_id.eq.${userId},destinatario_id.eq.${otherUserId}),and(remetente_id.eq.${otherUserId},destinatario_id.eq.${userId})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Contar mensagens não lidas
                const { count: unreadCount } = await supabase
                    .from('mensagens')
                    .select('*', { count: 'exact', head: true })
                    .eq('destinatario_id', userId)
                    .eq('remetente_id', otherUserId)
                    .eq('lida', false);

                return {
                    user,
                    lastMessage,
                    unreadCount: unreadCount || 0,
                    ultima_mensagem: conv.ultima_mensagem
                };
            })
        );

        return { success: true, conversations: detailedConversations };

    } catch (error) {
        console.error('Erro ao obter conversas:', error);
        return { success: false, error: error.message };
    }
}

// Obter mensagens de uma conversa
async function getConversationMessages(otherUserId, page = 1, limit = 50) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data: messages, error, count } = await supabase
            .from('mensagens')
            .select(`
                *,
                remetente:remetente_id (nome, tipo),
                destinatario:destinatario_id (nome)
            `, { count: 'exact' })
            .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${otherUserId}),and(remetente_id.eq.${otherUserId},destinatario_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        // Marcar mensagens como lidas
        await supabase
            .from('mensagens')
            .update({ lida: true, data_leitura: new Date() })
            .eq('destinatario_id', user.id)
            .eq('remetente_id', otherUserId)
            .eq('lida', false);

        return { 
            success: true, 
            messages: messages || [], 
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
        };

    } catch (error) {
        console.error('Erro ao obter mensagens:', error);
        return { success: false, error: error.message };
    }
}

// Marcar mensagem como lida
async function markMessageAsRead(messageId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { data: message, error } = await supabase
            .from('mensagens')
            .update({ 
                lida: true, 
                data_leitura: new Date() 
            })
            .eq('id', messageId)
            .eq('destinatario_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, message };

    } catch (error) {
        console.error('Erro ao marcar mensagem como lida:', error);
        return { success: false, error: error.message };
    }
}

// Marcar todas as mensagens como lidas
async function markAllMessagesAsRead(otherUserId = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        let query = supabase
            .from('mensagens')
            .update({ 
                lida: true, 
                data_leitura: new Date() 
            })
            .eq('destinatario_id', user.id)
            .eq('lida', false);

        if (otherUserId) {
            query = query.eq('remetente_id', otherUserId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, message: 'Mensagens marcadas como lidas' };

    } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
        return { success: false, error: error.message };
    }
}

// ========== NOTIFICAÇÕES ==========

// Enviar notificação
async function sendNotification(notificationData) {
    try {
        const { data: notification, error } = await supabase
            .from('notificacoes')
            .insert({
                usuario_id: notificationData.usuario_id,
                titulo: notificationData.titulo,
                mensagem: notificationData.mensagem,
                tipo: notificationData.tipo || 'info',
                acao_url: notificationData.acao_url,
                acao_texto: notificationData.acao_texto
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, notification };

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        return { success: false, error: error.message };
    }
}

// Obter notificações do usuário
async function getNotifications(userId, limit = 20) {
    try {
        const { data: notifications, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Contar não lidas
        const { count: unreadCount } = await supabase
            .from('notificacoes')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', userId)
            .eq('lida', false);

        return { 
            success: true, 
            notifications: notifications || [], 
            unreadCount: unreadCount || 0 
        };

    } catch (error) {
        console.error('Erro ao obter notificações:', error);
        return { success: false, error: error.message };
    }
}

// Marcar notificação como lida
async function markNotificationAsRead(notificationId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { data: notification, error } = await supabase
            .from('notificacoes')
            .update({ 
                lida: true, 
                data_leitura: new Date() 
            })
            .eq('id', notificationId)
            .eq('usuario_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, notification };

    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return { success: false, error: error.message };
    }
}

// Marcar todas as notificações como lidas
async function markAllNotificationsAsRead() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const { data, error } = await supabase
            .from('notificacoes')
            .update({ 
                lida: true, 
                data_leitura: new Date() 
            })
            .eq('usuario_id', user.id)
            .eq('lida', false);

        if (error) throw error;

        return { success: true, message: 'Todas as notificações marcadas como lidas' };

    } catch (error) {
        console.error('Erro ao marcar notificações como lidas:', error);
        return { success: false, error: error.message };
    }
}

// Limpar notificações antigas
async function clearOldNotifications(days = 30) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { error } = await supabase
            .from('notificacoes')
            .delete()
            .eq('usuario_id', user.id)
            .lt('created_at', cutoffDate.toISOString());

        if (error) throw error;

        return { success: true, message: `Notificações antigas (mais de ${days} dias) removidas` };

    } catch (error) {
        console.error('Erro ao limpar notificações antigas:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funções
window.addReview = addReview;
window.getProductReviews = getProductReviews;
window.getVendorReviews = getVendorReviews;
window.replyToReview = replyToReview;
window.sendMessage = sendMessage;
window.getConversations = getConversations;
window.getConversationMessages = getConversationMessages;
window.markMessageAsRead = markMessageAsRead;
window.markAllMessagesAsRead = markAllMessagesAsRead;
window.sendNotification = sendNotification;
window.getNotifications = getNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.clearOldNotifications = clearOldNotifications;