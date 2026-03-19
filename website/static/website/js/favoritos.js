// js/favoritos.js

// Carregar favoritos do usuário
async function loadFavorites(userId) {
    try {
        const { data: favorites, error } = await supabase
            .from('favoritos')
            .select(`
                *,
                produto:produto_id (
                    id,
                    nome,
                    preco,
                    imagem_principal_url,
                    categoria,
                    status,
                    vendedor_id,
                    profiles!produtos_vendedor_id_fkey (nome, verificado)
                )
            `)
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, favorites: favorites || [] };

    } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        return { success: false, error: error.message };
    }
}

// Adicionar/remover dos favoritos
async function toggleFavorite(productId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Verificar se já está nos favoritos
        const { data: existing, error: checkError } = await supabase
            .from('favoritos')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('produto_id', productId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = nenhum resultado
            throw checkError;
        }

        if (existing) {
            // Remover dos favoritos
            const { error: deleteError } = await supabase
                .from('favoritos')
                .delete()
                .eq('id', existing.id);

            if (deleteError) throw deleteError;

            // Atualizar contador do produto
            await supabase.rpc('decrement_favorite_count', { product_id: productId });

            return { success: true, added: false, message: 'Removido dos favoritos' };

        } else {
            // Adicionar aos favoritos
            const { error: insertError } = await supabase
                .from('favoritos')
                .insert({
                    usuario_id: user.id,
                    produto_id: productId
                });

            if (insertError) throw insertError;

            // Atualizar contador do produto
            await supabase.rpc('increment_favorite_count', { product_id: productId });

            return { success: true, added: true, message: 'Adicionado aos favoritos' };
        }

    } catch (error) {
        console.error('Erro ao alternar favorito:', error);
        return { success: false, error: error.message };
    }
}

// Remover dos favoritos
async function removeFromFavorites(favoriteId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Primeiro obter o product_id para atualizar o contador
        const { data: favorite, error: fetchError } = await supabase
            .from('favoritos')
            .select('produto_id')
            .eq('id', favoriteId)
            .eq('usuario_id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // Remover dos favoritos
        const { error: deleteError } = await supabase
            .from('favoritos')
            .delete()
            .eq('id', favoriteId)
            .eq('usuario_id', user.id);

        if (deleteError) throw deleteError;

        // Atualizar contador do produto
        await supabase.rpc('decrement_favorite_count', { product_id: favorite.produto_id });

        return { success: true, message: 'Removido dos favoritos' };

    } catch (error) {
        console.error('Erro ao remover dos favoritos:', error);
        return { success: false, error: error.message };
    }
}

// Verificar se um produto está nos favoritos
async function checkIfFavorite(productId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return false;

        const { data, error } = await supabase
            .from('favoritos')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('produto_id', productId)
            .single();

        return !!data;

    } catch (error) {
        // Se não encontrar (PGRST116), retorna false
        if (error.code === 'PGRST116') return false;
        console.error('Erro ao verificar favorito:', error);
        return false;
    }
}

// Obter contagem de favoritos de um produto
async function getFavoriteCount(productId) {
    try {
        const { count, error } = await supabase
            .from('favoritos')
            .select('*', { count: 'exact', head: true })
            .eq('produto_id', productId);

        if (error) throw error;

        return { success: true, count: count || 0 };

    } catch (error) {
        console.error('Erro ao obter contagem de favoritos:', error);
        return { success: false, error: error.message };
    }
}

// Limpar todos os favoritos
async function clearAllFavorites() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { success: false, error: 'Usuário não autenticado' };
        }

        // Primeiro obter todos os produtos favoritados para atualizar contadores
        const { data: favorites, error: fetchError } = await supabase
            .from('favoritos')
            .select('produto_id')
            .eq('usuario_id', user.id);

        if (fetchError) throw fetchError;

        // Remover todos os favoritos
        const { error: deleteError } = await supabase
            .from('favoritos')
            .delete()
            .eq('usuario_id', user.id);

        if (deleteError) throw deleteError;

        // Atualizar contadores de cada produto
        if (favorites && favorites.length > 0) {
            for (const favorite of favorites) {
                await supabase.rpc('decrement_favorite_count', { product_id: favorite.produto_id });
            }
        }

        return { success: true, message: 'Todos os favoritos foram removidos' };

    } catch (error) {
        console.error('Erro ao limpar favoritos:', error);
        return { success: false, error: error.message };
    }
}

// Obter produtos mais favoritados
async function getMostFavoritedProducts(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select(`
                *,
                favoritos:produto_id (count),
                profiles!produtos_vendedor_id_fkey (nome, verificado)
            `)
            .eq('status', 'ativo')
            .order('favoritado', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { success: true, products: data || [] };

    } catch (error) {
        console.error('Erro ao obter produtos mais favoritados:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funções
window.loadFavorites = loadFavorites;
window.toggleFavorite = toggleFavorite;
window.removeFromFavorites = removeFromFavorites;
window.checkIfFavorite = checkIfFavorite;
window.getFavoriteCount = getFavoriteCount;
window.clearAllFavorites = clearAllFavorites;
window.getMostFavoritedProducts = getMostFavoritedProducts;