from supabase import create_client
import os
SUPABASE_URL=os.environ.get('SUPABASE_URL')
SUPABASE_KEY=os.environ.get('SUPABASE_KEY')
SUPABASE_BUCKET=os.environ.get('SUPABASE_BUCKET')
supabase=create_client(SUPABASE_URL,SUPABASE_KEY)
def upload_imagem(arquivo, caminho_bucket):
    arquivo.file.seek(0)
    # arquivo já é o arquivo em memória vindo do request.FILES
    supabase.storage.from_(SUPABASE_BUCKET).upload(caminho_bucket, arquivo.file)

    url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(caminho_bucket)
    return url
