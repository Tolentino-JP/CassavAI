import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()



url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# db_host = os.getenv("DB_HOST")
# db_user = os.getenv("DB_USER")
# db_pass = os.getenv("DB_PASS")
# db_name = os.getenv("DB_NAME")


