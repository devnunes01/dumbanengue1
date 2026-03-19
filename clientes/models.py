from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.
class Usuarios(AbstractUser):
    nome=models.CharField(
        max_length=255,

    )
    numero=models.CharField(
        max_length=9
    )
    tipo=models.CharField(
        max_length=14,


    )
    
    verificado=models.BooleanField(
        default=False
    )
    subscrito=models.BooleanField(
        default=False
    )
    