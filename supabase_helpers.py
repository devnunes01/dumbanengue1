from supabase import create_client
import os
SUPABASE_URL=os.environ.get('SUPABASE_URL')
SUPABASE_KEY=os.environ.get('SUPABASE_KEY')
SUPABASE_BUCKET=os.environ.get('SUPABASE_BUCKET')
supabase=create_client(SUPABASE_URL,SUPABASE_KEY)
def upload_imagem(caminho_local, caminho_bucket):
    with open(caminho_local, "rb") as f:
        supabase.storage.from_(SUPABASE_BUCKET).upload(caminho_bucket, f)
    url=supabase.storage.from_(SUPABASE_BUCKET).get_public_url(caminho_bucket)
    return url
