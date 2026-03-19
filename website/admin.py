from django.contrib import admin
from .models import Produtos,Carrinho,ItemCarrinho,Pagamento,Verificacao,Subscricao
# Register your models here.
admin.site.register(Produtos)
admin.site.register(Carrinho)
admin.site.register(ItemCarrinho)
admin.site.register(Pagamento)
admin.site.register(Verificacao)
admin.site.register(Subscricao)