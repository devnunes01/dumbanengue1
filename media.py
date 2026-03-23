import os
import cloudinary
import cloudinary.uploader
CLOUDINARY__URL = os.environ.get('CLOUDINARY_URL')
MEDIA_ROOT="media"

cloudinary.config(
    cloud_name=os.environ.get('CLOUD_NAME'),
    api_key=os.environ.get('API_KEY'),
    api_secret=os.environ.get('API_SECRET')
)


for root, dirs, files in os.walk(MEDIA_ROOT):
    for file in files:
        caminho_completo = os.path.join(root, file)
        caminho_relativo=os.path.relpath(caminho_completo, MEDIA_ROOT)
        print(f"Fazendo upload do arquivo: {caminho_relativo} para o Cloudinary com o caminho relativo: {caminho_relativo}")
        cloudinary.uploader.upload(
            caminho_completo,
            public_id=caminho_relativo,
            resource_type="image",
            overwrite=True
            )
        