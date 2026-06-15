import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(url, key)


def UploadUserResult(items: dict): 

    try:
        response = (
            supabase.table("result").insert({
                "file_name": items["file_name"],
                "prediction": items["prediction"],
                "province": items["province"],
                "city": items["city"],
                "barangay": items["barangay"],
                "confidence": items["confidence"]
            }).execute()
        )
    except Exception as e:
        print(e)
        response = False

    if not response:
        return False
    else:
        return response
    


def FetchAnalytics() :

    try:
        result = (supabase.table("result").select("*").execute())
    except Exception as e:
        print(e)
    finally:
        return result