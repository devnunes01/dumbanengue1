from django.urls import path
from . import views

app_name='website'
urlpatterns=[
    path('',views.index, name='index'),
    path('cadastro/',views.cadastro, name='cadastro'),
    path('produtos/', views.produtos, name='produtos'),
    path('planos/', views.planos, name='planos'),
    path('minhas-subscricoes/', views.minhas_subscricoes, name='minhas_subscricoes'),
    path('login/', views.Login, name='login'),
    path('checkout/', views.checkout, name='checkout'),
    path('notificacoes/', views.notificacoes, name='notificacoes'),
    path('painel/', views.painel, name='painel'),
    path('verificar/', views.verificar, name='verificar'),
    path('termos/',views.termos, name='termos'),
    path('sobre/',views.sobre, name='sobre'),
    path('produto<int:id>/',views.detalhe_produto, name='detalhe_produto'),
    path('carrinho/',views.ver_carrinho, name='ver_carrinho'),
    path('aumentar/<int:id>/',views.aumentar_quantidade, name='aumentar_quantidade'),
    path('diminuir/<int:id>/',views.diminuir_quantidade, name='diminuir_quantidade'),
    path('remover/<int:id>/',views.remover_item, name='remover_item'),
    path('finalizar/',views.finalizar_pedido, name='finalizar_pedido'),
    path('publicar/',views.publicar_produto ,name='publicar_produto'),
    path('lista-produtos/',views.lista_produtos ,name='lista_produtos'),
    path('frete/',views.escolher_frete ,name='frete'),
    path('pagamento/',views.pagamento ,name='pagamento'),
    path('adicionar_carrinho<int:id>/',views.adicionar_carrinho, name='adicionar_carrinho'),
    path('menu/',views.menu,name='menu'),
    path('verificado/',views.verificado,name='verificado'),
    path('subscricao/',views.minhas_subscricoes,name='subscricao'),


]