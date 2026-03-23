from django.db import models
from clientes.models import Usuarios
from django.utils import timezone
# Create your models here.
def caminho_produto(instance, filename):
    usuario_id=instance.user.id
    return f"produtos/usuario_{usuario_id}/{filename}"

def caminho_verificado(instance, filename):
    usuario_id=instance.user.id
    return f"verificacoes/usuario_{usuario_id}/{filename}"

def caminho_pagamento(instance, filename):
    usuario_id=instance.user.id
    return f"pagamentos/usuario_{usuario_id}/{filename}"

def caminho_plano(instance, filename):
    usuario_id=instance.user.id
    return f"planos/usuario_{usuario_id}/{filename}"

class Produtos(models.Model):
    CATEGORIAS=[
        ("eletronicos","Eletronicos"),
        ("roupas","Roupas"),
        ("veiculos","Veiculos"),
        ("outros","Outros"),
        ("servicos","Servicos"),
    ]
    user=models.ForeignKey(Usuarios,on_delete=models.CASCADE)
    foto=models.URLField(blank=True, null=True)
    nome=models.CharField( max_length=100)
    categoria=models.CharField(max_length=100,choices=CATEGORIAS)
    descricao=models.TextField()
    preco=models.DecimalField(max_digits=10, decimal_places=2)
    prazo=models.IntegerField()
    data=models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.nome

class Carrinho(models.Model):
    usuario=models.ForeignKey(Usuarios,on_delete=models.CASCADE)
    data=models.DateTimeField(auto_now_add=True)
    finalizado=models.BooleanField(default=False)
    referencia=models.CharField(max_length=20, blank=True)
    frete=models.BooleanField(default=False)
    def gerar_referencia(self):
        agora=timezone.now()
        return agora.strftime("%Y%m%d%H%M")
    
    def save(self, *args, **kwargs):
        if self.finalizado and not self.referencia:
             self.referencia =self.gerar_referencia()
        super().save(*args, **kwargs)



class ItemCarrinho(models.Model):
    carrinho=models.ForeignKey(Carrinho,on_delete=models.CASCADE)
    produto=models.ForeignKey(Produtos,on_delete=models.CASCADE)
    quantidade=models.IntegerField(default=1)
    def subtotal(self):
        return self.quantidade*self.produto.preco   


class Pagamento(models.Model):
    STATUS=[
        ("pendente","Pendente"),
        ("aprovado","Aprovado"),
        ("recusado","Recusado"),
    ]
    user=models.ForeignKey(Usuarios, on_delete=models.CASCADE)
    referencia=models.CharField(max_length=20)
    valor=models.DecimalField(max_digits=10,decimal_places=2)
    foto=models.URLField(blank=True, null=True)
    status=models.CharField(max_length=10,choices=STATUS, default="pendente")
    data=models.DateTimeField(auto_now_add=True)

class Verificacao(models.Model):
    STATUS=[
        ("pendente","Pendente"),
        ("aprovado","Aprovado"),
        ("recusado","Recusado"),
    ]
    user=models.ForeignKey(Usuarios, on_delete=models.CASCADE)
    fotofrente=models.URLField(blank=True, null=True)
    fotoverso=models.URLField(blank=True, null=True)
    rosto=models.URLField(blank=True, null=True)
    status=models.CharField(max_length=10,choices=STATUS, default="pendente")
    data=models.DateTimeField(auto_now_add=True)

class Subscricao(models.Model):
    STATUS=[
        ("pendente","Pendente"),
        ("aprovado","Aprovado"),
        ("recusado","Recusado"),
    ]
    user=models.ForeignKey(Usuarios, on_delete=models.CASCADE)
    status=models.CharField(max_length=10,choices=STATUS, default="pendente")
    foto=models.URLField(blank=True, null=True)
    data=models.DateTimeField(auto_now_add=True)
