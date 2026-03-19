import { supabase } from "./supabase.js";
import { verificarSessao } from "./session.js";

const user = await verificarSessao();

export async function adicionarCarrinho(produto_id, quantidade) {
  const { error } = await supabase.from("carrinho").insert({
    usuario_id: user.id,
    produto_id,
    quantidade
  });

  if (error) {
    alert(error.message);
  }
}

export async function listarCarrinho() {
  const { data, error } = await supabase
    .from("carrinho")
    .select("*, produtos(*)")
    .eq("usuario_id", user.id);

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}