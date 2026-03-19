import { supabase } from "./supabase.js";
import { verificarSessao } from "./session.js";

const user = await verificarSessao();

export async function finalizarPedido(itens) {
  let total = 0;
  itens.forEach(i => total += i.preco * i.quantidade);

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      comprador_id: user.id,
      total
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  for (const item of itens) {
    await supabase.from("pedido_itens").insert({
      pedido_id: pedido.id,
      produto_id: item.id,
      quantidade: item.quantidade,
      preco_unitario: item.preco
    });
  }

  alert("Pedido criado com sucesso");
}