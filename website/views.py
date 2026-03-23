from django.shortcuts import render,redirect,get_object_or_404
from django.contrib.auth import authenticate,login
from django.contrib import messages
from django.db.models import Q
from clientes.models import Usuarios
from .models import Produtos,Carrinho,ItemCarrinho,Pagamento,Verificacao,Subscricao
from decimal import  Decimal
from supabase_helpers import upload_imagem
# Create your views here.
def index(request):
    return render(request,'index.html')

def cadastro(request):
    if request.method == "POST":
        nome=request.POST.get("nome")
        numero=request.POST.get("numero")
        email=request.POST.get("email")
        senha1=request.POST.get("senha1")
        senha2=request.POST.get("senha2")
        tipo=request.POST.get("tipo")
        if Usuarios.objects.filter(email=email).exists():
            messages.error(request, "O email ja esta sendo usado")
            return render(request,"cadastro.html")
        if senha1==senha2:
            Usuarios.objects.create_user(
                username=email,
                nome=nome,
                password=senha2,
                email=email,
                numero=numero,
                tipo=tipo,
                verificado=False,
                subscrito=False

            )
            messages.success(request, "cadastro feito com sucesso")
            return redirect('/login/')
        else:
            messages.error(request,'as senhas devem ser iguais')
            return redirect('/cadastro/')
    return render(request,'cadastro.html')

def produtos(request):
    produtos=Produtos.objects.all().order_by('-id')
    return render(request,'produtos.html', {"produtos",produtos})

def planos(request):
    if request.method == "POST":
        foto=request.FILES.get("transacao")
        Subscricao.objects.create(
            user=request.user,
            foto=foto
        )
        messages.success(request, 'Comprovante enviado com sucesso')
        return redirect('/lista-produtos/')
    return render(request,'planos.html')

def Login(request):
    if request.method=="POST":
        username=request.POST.get("email")
        password=request.POST.get("senha")
        user=authenticate(request,username=username,password=password)
        if user is not None:
            login(request,user)
            return redirect('/painel/')
        else:
            messages.info(request, 'credenciais invalidas')
            return redirect('/login/')


    return render(request,'login.html')
def termos(request):
    return render(request,'termos.html')


def checkout(request):
    return render(request,'checkout.html')

def notificacoes(request):
    return render(request,'notificacoes.html')

def mensagens(request):
    return render(request,'mensagens.html')

def painel(request):
    produtos=Produtos.objects.all()

    return render(request,'painel.html',{"produtos":produtos})

def menu(request):
    return render(request,'menu.html')

def verificado(request):
    pessoa=Verificacao.objects.filter(user=request.user).first()
    return render(request,'verificado.html',{"pessoa":pessoa})


def verificar(request):
    user=request.user
    if user.verificado:
        return redirect('/verificado/')
    else:
        if request.method=="POST":
            fotofrente=request.FILES.get("fotofrente")
            fotoverso=request.FILES.get("fotoverso")
            rosto=request.FILES.get("rosto")
            def salvar_foto(arquivo,pasta):
                if not arquivo:
                    return None

                caminho_local=f"media/{arquivo.name}"
                with open(caminho_local, "wb+") as f:
                    for chunk in arquivo.chunks():
                        f.write(chunk)
                url=upload_imagem(caminho_local, f"verificacoes/{pasta}_{arquivo.name}")
                os.remove(caminho_local)
                return url

            url1=salvar_foto(fotofrente, "fotofrente")
            url2=salvar_foto(fotoverso, "fotoverso")
            url3=salvar_foto(rosto, "rosto")

            Verificacao.objects.create(
                user=request.user,
                fotofrente=url1,
                fotoverso=url2,
                rosto=url3,
                status="pendente"
        )

            messages.success(request, 'Fotos enviadas, aguarde a revisao!')
            return redirect('/lista-produtos/')

    return render (request, 'verificar.html')
    

def sobre(request):
    return render (request, 'sobre.html')

def detalhe_produto(request,id):
    produto=get_object_or_404(Produtos,id=id)
    return render(request, "produto.html", 
                  {
                      "produto":produto
                      })

def adicionar_carrinho(request,id):
    produto=Produtos.objects.get(id=id)
    carrinho,criado=Carrinho.objects.get_or_create(
        usuario=request.user,
        finalizado=False
    )
    item,criado=ItemCarrinho.objects.get_or_create(
        carrinho=carrinho,
        produto=produto
    )
    if not criado:
        item.quantidade+=1
        item.save()

    return redirect('/lista-produtos/')

def ver_carrinho(request):
    carrinho=Carrinho.objects.filter(
        usuario=request.user,
        finalizado=False
    ).first()
    itens=[]
    total=0
    subtotal=0
    taxa=0
    frete=0
    if carrinho:
        itens=ItemCarrinho.objects.filter(carrinho=carrinho)
        for item in itens:
            subtotal+=item.subtotal()
        taxa=(subtotal* Decimal(0.05)).quantize(Decimal('0.01'))
        if carrinho.frete:
            frete=100
        total=subtotal+taxa+frete
    return render(request,"carrinho.html",
                  {"itens":itens,
                   "subtotal":subtotal,
                   "taxa":taxa,
                   "frete":frete,
                   "total":total
                   })

def escolher_frete(request):
    carrinho=Carrinho.objects.get(
        usuario=request.user,
        finalizado=False
    )
    carrinho.frete=True
    carrinho.save()
    return redirect("/carrinho/")

def aumentar_quantidade(request,id):
    item=ItemCarrinho.objects.get(id=id)
    item.quantidade+=1
    item.save()
    return redirect('/carrinho/')


def diminuir_quantidade(request,id):
    item=ItemCarrinho.objects.get(id=id)
    if item.quantidade >1:
        item.quantidade-=1
        item.save()
    else:
        item.delete()
    return redirect('/carrinho/')

def remover_item(request,id):
    item=ItemCarrinho.objects.get(id=id)
    item.delete()
    return redirect('/carrinho/')

def finalizar_pedido(request):
    carrinho=Carrinho.objects.get(
        usuario=request.user,
        finalizado=False
    )
    carrinho.finalizado=True
    carrinho.save()
    return redirect ('/painel/')

def publicar_produto(request):
    user=request.user
    if user.verificado and user.subscrito:

        if request.method=="POST":
            nome=request.POST.get("nome")
            categoria=request.POST.get("categoria")
            descricao=request.POST.get("descricao")
            preco=request.POST.get("preco")
            prazo=request.POST.get("prazo")
            foto=request.FILES.get("foto")
            def salvar_foto(arquivo,pasta):
                if not arquivo:
                    return None

                caminho_local=f"media/{arquivo.name}"
                with open(caminho_local, "wb+") as f:
                    for chunk in arquivo.chunks():
                        f.write(chunk)
                url=upload_imagem(caminho_local, f"produtos/{pasta}_{arquivo.name}")
                os.remove(caminho_local)
                return url
            url1=salvar_foto(foto, "user")

            Produtos.objects.create(
                user=user,
                nome=nome,
                categoria=categoria,
                descricao=descricao,
                preco=preco,
                prazo=prazo,
                foto=url1
            )
            messages.success(request, 'Produto publicado com sucesso!')
            return redirect("/painel/")
        return render(request, "publicar_produto.html")
    else:
        return render(request,"aviso.html")

def lista_produtos(request):
    q = request.GET.get('q', '').strip()
    categoria = request.GET.get('categoria', '').strip()

    produtos = Produtos.objects.all()

    if categoria:
        # Filtra por categoria (case-insensitive) para que os botões de categoria funcionem corretamente
        produtos = produtos.filter(categoria__icontains=categoria)

    if q:
        produtos = produtos.filter(
            Q(nome__icontains=q) | Q(descricao__icontains=q) | Q(categoria__icontains=q)
        )

    existe = produtos.exists()

    return render(request, "lista_produtos.html", {
        "produtos": produtos,
        "q": q,
        "categoria": categoria,
        "existe": existe,
    })

def pagamento(request):
    carrinho=Carrinho.objects.get(
        usuario=request.user,
        finalizado=False
    )
    itens=ItemCarrinho.objects.filter(carrinho=carrinho)
    subtotal=0
    for item in itens:
        subtotal+=item.subtotal()
    taxa=(subtotal* Decimal(0.05)).quantize(Decimal('0.01'))
    frete= 100 if carrinho.frete else 0
    total=subtotal+taxa+frete
    referencia=carrinho.gerar_referencia()
    if request.method=="POST":
        foto=request.FILES.get("transacao")
        def salvar_foto(arquivo,pasta):
                if not arquivo:
                    return None

                caminho_local=f"media/{arquivo.name}"
                with open(caminho_local, "wb+") as f:
                    for chunk in arquivo.chunks():
                        f.write(chunk)
                url=upload_imagem(caminho_local, f"pagamentos/{pasta}_{arquivo.name}")
                os.remove(caminho_local)
                return url
        url1=salvar_foto(foto,"user")
        Pagamento.objects.create(
            user=request.user,
            referencia=referencia,
            valor=total,
            foto=url1,
            status="pendente"
        )
        carrinho.referencia=referencia
        carrinho.finalizado=True
        carrinho.save()
        messages.success(request, 'Comprovante enviado com sucesso! Aguardando confirmação.')
        return redirect ("/lista-produtos/")

    return render(request, "pagamento.html",{
        "total":total,
        "referencia":referencia
    })    

def minhas_subscricoes(request):
    if not request.user.is_authenticated:
        return redirect('/login/')

    subscricoes = Subscricao.objects.filter(user=request.user).order_by('-data')
    return render(request, 'minhas_subscricoes.html', {
        'subscricoes': subscricoes
    })    